//This is just a changed mindar detector, it is changed directly in node modules and is here only for documentation purpouses 
//Este é apenas o detector do mindar modificado diretamente em node_modules e está aqui apenas para ser documentado 

// result should be similar to previou
// improve freka descriptors computation 
import * as tf from '@tensorflow/tfjs';
import { FREAKPOINTS } from './freak.js';
import './kernels/webgl/index.js';
const PYRAMID_MIN_SIZE = 8;
const PYRAMID_MAX_OCTAVE = 5;
const NUM_BUCKETS_PER_DIMENSION = 10;
const MAX_FEATURES_PER_BUCKET = 5;
const ORIENTATION_GAUSSIAN_EXPANSION_FACTOR = 3.0;
const ORIENTATION_REGION_EXPANSION_FACTOR = 1.5;


class Detector {
	constructor(width, height, debugMode = false) {
		this.debugMode = debugMode;
		this.width = width;
		this.height = height;
		let numOctaves = 0;
		while (width >= PYRAMID_MIN_SIZE && height >= PYRAMID_MIN_SIZE) {
			width /= 2;
			height /= 2;
			numOctaves++;
			if (numOctaves === PYRAMID_MAX_OCTAVE) break;
		}
		this.numOctaves = numOctaves;

		this.tensorCaches = {};
		this.kernelCaches = {};
	}

	// used in compiler
	detectImageData(imageData) {
		const arr = new Uint8ClampedArray(4 * imageData.length);
		for (let i = 0; i < imageData.length; i++) {
			arr[4 * i] = imageData[i];
			arr[4 * i + 1] = imageData[i];
			arr[4 * i + 2] = imageData[i];
			arr[4 * i + 3] = 255;
		}
		const img = new ImageData(arr, this.width, this.height);
		return this.detect(img);
	}
	/**
	 * 
	 * @param {tf.Tensor<tf.Rank>} inputImageT 
	 * @returns 
	 */
	detect(inputImageT) {
		let debugExtra = null;

		// Build gaussian pyramid images, two images per octave
		/** @type {Array<Array<tf.Tensor<tf.Rank>>} */
		const pyramidImagesT = [];
		//console.log("Detector::Building pyramid Images...");
		for (let i = 0; i < this.numOctaves; i++) {
			let image1T;
			let image2T;


			if (i === 0) {
				image1T = this._applyFilter(inputImageT);
			} else {
				image1T = this._downsampleBilinear(pyramidImagesT[i - 1][pyramidImagesT[i - 1].length - 1]);
			}
			image2T = this._applyFilter(image1T);
			pyramidImagesT.push([image1T, image2T]);
		}
		//console.log("Detector::Building dog images...");
		// Build difference-of-gaussian (dog) pyramid
		/** @type {tf.Tensor<tf.Rank>[]} */
		const dogPyramidImagesT = [];
		for (let i = 0; i < this.numOctaves; i++) {
			let dogImageT = this._differenceImageBinomial(pyramidImagesT[i][0], pyramidImagesT[i][1]);
			dogPyramidImagesT.push(dogImageT);
		}
		/** @type {tf.Tensor<tf.Rank>[]} */
		const extremasResultsT = [];
		for (let i = 1; i < this.numOctaves - 1; i++) {
			const extremasResultT = this._buildExtremas(dogPyramidImagesT[i - 1], dogPyramidImagesT[i], dogPyramidImagesT[i + 1]);
			extremasResultsT.push(extremasResultT);
		}
		const prunedExtremasList = this._applyPrune(extremasResultsT);

		const prunedExtremasT = this._computeLocalization(prunedExtremasList, dogPyramidImagesT);

		// compute the orientation angle for each pruned extremas
		const extremaHistogramsT = this._computeOrientationHistograms(prunedExtremasT, pyramidImagesT);

		const smoothedHistogramsT = this._smoothHistograms(extremaHistogramsT);
		const extremaAnglesT = this._computeExtremaAngles(smoothedHistogramsT);

		// to compute freak descriptors, we first find the pixel value of 37 freak points for each extrema 
		const extremaFreaksT = this._computeExtremaFreak(pyramidImagesT, prunedExtremasT, extremaAnglesT);

		// compute the binary descriptors
		const freakDescriptorsT = this._computeFreakDescriptors(extremaFreaksT);

		// const prunedExtremasArr = prunedExtremasT.arraySync();
		// const extremaAnglesArr = extremaAnglesT.arraySync();
		// const freakDescriptorsArr = freakDescriptorsT.arraySync();

		if (this.debugMode) {
			debugExtra = {
				pyramidImages: pyramidImagesT.map((ts) => ts.map((t) => t.arraySync())),
				dogPyramidImages: dogPyramidImagesT.map((t) => t ? t.arraySync() : null),
				extremasResults: extremasResultsT.map((t) => t.arraySync()),
				extremaAngles: extremaAnglesT.arraySync(),
				prunedExtremas: prunedExtremasList,
				localizedExtremas: prunedExtremasT.arraySync(),
			}
		}

		pyramidImagesT.forEach((ts) => ts.forEach((t) => t.dispose()));
		dogPyramidImagesT.forEach((t) => t && t.dispose());
		extremasResultsT.forEach((t) => t.dispose());
		prunedExtremasT.dispose();
		extremaHistogramsT.dispose();
		smoothedHistogramsT.dispose();
		extremaAnglesT.dispose();
		extremaFreaksT.dispose();
		freakDescriptorsT.dispose();

		// const featurePoints = [];

		// for (let i = 0; i < prunedExtremasArr.length; i++) {
		// 	if (prunedExtremasArr[i][0] == 0) continue;

		// 	const descriptors = [];
		// 	for (let m = 0; m < freakDescriptorsArr[i].length; m += 4) {
		// 		const v1 = freakDescriptorsArr[i][m];
		// 		const v2 = freakDescriptorsArr[i][m + 1];
		// 		const v3 = freakDescriptorsArr[i][m + 2];
		// 		const v4 = freakDescriptorsArr[i][m + 3];

		// 		let combined = v1 * 16777216 + v2 * 65536 + v3 * 256 + v4;
		// 		descriptors.push(combined);
		// 	}

		// 	const octave = prunedExtremasArr[i][1];
		// 	const y = prunedExtremasArr[i][2];
		// 	const x = prunedExtremasArr[i][3];
		// 	const originalX = x * Math.pow(2, octave) + Math.pow(2, (octave - 1)) - 0.5;
		// 	const originalY = y * Math.pow(2, octave) + Math.pow(2, (octave - 1)) - 0.5;
		// 	const scale = Math.pow(2, octave);

		// 	featurePoints.push({
		// 		maxima: prunedExtremasArr[i][0] > 0,
		// 		x: originalX,
		// 		y: originalY,
		// 		scale: scale,
		// 		angle: extremaAnglesArr[i],
		// 		descriptors: descriptors
		// 	});
		// }
		// return { featurePoints, debugExtra };

		const isMaxIm = tf.sign(prunedExtremasT.slice([0, 0], [-1, 1]));                   // [N,1]
		// octave integer
		const octaveIm = prunedExtremasT.slice([0, 1], [-1, 1]).cast('int32');           // [N,1]
		// compute scale = 2^octave
		const scaleIm = tf.pow(tf.scalar(2, 'int32'), octaveIm).cast('float32');         // [N,1]
		// descriptorsT: already [N, D]
		const descriptorsT = freakDescriptorsT;                                           // [N, D]
		// Stack into one tensor [N, 3 + D]
		const allFeaturesT = tf.concat([isMaxIm, octaveIm.toFloat(), scaleIm, descriptorsT], 1);

		// Step 2: Single sync
		const allArr = allFeaturesT.arraySync();  // single host-device roundtrip

		// Step 3: CPU-side unpacking
		const featurePoints = allArr.map((row) => {
		const [isMaxVal, octVal, scaleVal, ...descBytes] = row;
		// original shift offset
		const shift = (octVal > 0) ? (Math.pow(2, octVal - 1) - 0.5) : -0.5;
		// positions y,x were embedded if needed, or recomputed here
		// const y = ...; // reconstruct if you stored it
		// const x = ...;
		const originalX = x * scaleVal + shift;
		const originalY = y * scaleVal + shift;

		// pack descriptor bytes into uint32 words
		const descriptors = [];
		for (let i = 0; i < descBytes.length; i += 4) {
			descriptors.push(
			(descBytes[i] << 24) |
			(descBytes[i + 1] << 16) |
			(descBytes[i + 2] << 8) |
			(descBytes[i + 3])
			);
		}

		return {
			maxima: isMaxVal > 0,
			x: originalX,
			y: originalY,
			scale: scaleVal,
			angle: 0,              // angle can be similarly packed in GPU concat if desired
			descriptors
		};
		});

		return { featurePoints, debugExtra };
	}

	_computeFreakDescriptors(extremaFreaks) {
		if (!this.tensorCaches.computeFreakDescriptors) {
			const in1Arr = [];
			const in2Arr = [];
			for (let k1 = 0; k1 < extremaFreaks.shape[1]; k1++) {
				for (let k2 = k1 + 1; k2 < extremaFreaks.shape[1]; k2++) {
					in1Arr.push(k1);
					in2Arr.push(k2);
				}
			}
			const in1 = tf.tensor(in1Arr, [in1Arr.length]).cast('int32');
			const in2 = tf.tensor(in2Arr, [in2Arr.length]).cast('int32');

			this.tensorCaches.computeFreakDescriptors = {
				positionT: tf.keep(tf.stack([in1, in2], 1))
			}
		}
		const { positionT } = this.tensorCaches.computeFreakDescriptors;
		return tf.tidy(() => {
			return tf.engine().runKernel('ComputeFreakDescriptors', { extremaFreaks, positionT });
		});
	}

	_computeExtremaFreak(pyramidImagesT, prunedExtremas, prunedExtremasAngles) {
		if (!this.tensorCaches._computeExtremaFreak) {
			tf.tidy(() => {
				const freakPoints = tf.tensor(FREAKPOINTS);
				this.tensorCaches._computeExtremaFreak = {
					freakPointsT: tf.keep(freakPoints),
				};
			});
		}
		const { freakPointsT } = this.tensorCaches._computeExtremaFreak;

		const gaussianImagesT = [];
		for (let i = 1; i < pyramidImagesT.length; i++) {
			//gaussianImagesT.push(pyramidImagesT[i][0]);
			gaussianImagesT.push(pyramidImagesT[i][1]); // better
		}

		return tf.tidy(() => {
			return tf.engine().runKernel('ComputeExtremaFreak', { gaussianImagesT, prunedExtremas, prunedExtremasAngles, freakPointsT, pyramidImagesLength: pyramidImagesT.length });
		});
	}
	/**
	 * 
	 * @param {tf.Tensor<tf.Rank>} histograms 
	 * @returns 
	 */
	_computeExtremaAngles(histograms) {
		return tf.tidy(() => {
			/* const program = this.kernelCaches.computeExtremaAngles;
			return this._compileAndRun(program, [histograms]); */
			return tf.engine().runKernel("ComputeExtremaAngles", { histograms });
		});
	}

	// TODO: maybe can try just using average momentum, instead of histogram method. histogram might be overcomplicated
	/**
	 * 
	 * @param {tf.Tensor<tf.Rank>} prunedExtremasT 
	 * @param {tf.Tensor<tf.Rank>[]} pyramidImagesT 
	 * @returns 
	 */
	_computeOrientationHistograms(prunedExtremasT, pyramidImagesT) {

		const gaussianImagesT = [];
		for (let i = 1; i < pyramidImagesT.length; i++) {
			gaussianImagesT.push(pyramidImagesT[i][1]);
		}

		if (!this.tensorCaches.orientationHistograms) {
			tf.tidy(() => {
				const gwScale = -1.0 / (2 * ORIENTATION_GAUSSIAN_EXPANSION_FACTOR * ORIENTATION_GAUSSIAN_EXPANSION_FACTOR);
				const radius = ORIENTATION_GAUSSIAN_EXPANSION_FACTOR * ORIENTATION_REGION_EXPANSION_FACTOR;
				const radiusCeil = Math.ceil(radius);

				const radialProperties = [];
				for (let y = -radiusCeil; y <= radiusCeil; y++) {
					for (let x = -radiusCeil; x <= radiusCeil; x++) {
						const distanceSquare = x * x + y * y;

						// may just assign w = 1 will do, this could be over complicated.
						if (distanceSquare <= radius * radius) {
							const _x = distanceSquare * gwScale;
							// fast expontenial approx
							let w = (720 + _x * (720 + _x * (360 + _x * (120 + _x * (30 + _x * (6 + _x)))))) * 0.0013888888;
							radialProperties.push([y, x, w]);
						}
					}
				}

				this.tensorCaches.orientationHistograms = {
					radialPropertiesT: tf.keep(tf.tensor(radialProperties, [radialProperties.length, 3])),
				}
			});
		}
		const { radialPropertiesT } = this.tensorCaches.orientationHistograms;
		return tf.tidy(() => {
			return tf.engine().runKernel('ComputeOrientationHistograms', { gaussianImagesT, prunedExtremasT, radialPropertiesT, pyramidImagesLength: pyramidImagesT.length });
		});
	}

	// The histogram is smoothed with a Gaussian, with sigma = 1
	_smoothHistograms(histograms) {
		return tf.tidy(() => {
			return tf.engine().runKernel("SmoothHistograms", { histograms });//
		});
	}
	/**
	 * 
	 * @param {number[][]} prunedExtremasList 
	 * @param {tf.Tensor<tf.Rank>[]} dogPyramidImagesT 
	 * @returns 
	 */
	_computeLocalization(prunedExtremasList, dogPyramidImagesT) {
		return tf.tidy(() => {
			const pixelsT = tf.engine().runKernel('ComputeLocalization', { prunedExtremasList, dogPyramidImagesT });//this._compileAndRun(program, [...dogPyramidImagesT.slice(1), prunedExtremasT]);
			const pixels = pixelsT.arraySync();

			const result = [];
			for (let i = 0; i < pixels.length; i++) {
				result.push([]);
				for (let j = 0; j < pixels[i].length; j++) {
					result[i].push([]);
				}
			}

			const localizedExtremas = [];
			for (let i = 0; i < prunedExtremasList.length; i++) {
				localizedExtremas[i] = [
					prunedExtremasList[i][0],
					prunedExtremasList[i][1],
					prunedExtremasList[i][2],
					prunedExtremasList[i][3],
				];
			}

			for (let i = 0; i < localizedExtremas.length; i++) {
				if (localizedExtremas[i][0] === 0) {
					continue;
				}
				const pixel = pixels[i];
				const dx = 0.5 * (pixel[1][2] - pixel[1][0]);
				const dy = 0.5 * (pixel[2][1] - pixel[0][1]);
				const dxx = pixel[1][2] + pixel[1][0] - 2 * pixel[1][1];
				const dyy = pixel[2][1] + pixel[0][1] - 2 * pixel[1][1];
				const dxy = 0.25 * (pixel[0][0] + pixel[2][2] - pixel[0][2] - pixel[2][0]);

				const det = dxx * dyy - dxy * dxy;
				const ux = (dyy * -dx + -dxy * -dy) / det;
				const uy = (-dxy * -dx + dxx * -dy) / det;

				const newY = localizedExtremas[i][2] + uy;
				const newX = localizedExtremas[i][3] + ux;

				if (Math.abs(det) < 0.0001) {
					continue;
				}

				localizedExtremas[i][2] = newY;
				localizedExtremas[i][3] = newX;
			}
			return tf.tensor(localizedExtremas, [localizedExtremas.length, localizedExtremas[0].length], 'float32');
		});
	}

	// faster to do it in CPU
	// if we do in gpu, we probably need to use tf.topk(), which seems to be run in CPU anyway (no gpu operation for that)
	//  TODO: research adapative maximum supression method
	/**
	 * 
	 * @param {tf.Tensor<tf.Rank>[]} extremasResultsT 
	 * @returns 
	 */
	_applyPrune(extremasResultsT) {
		const nBuckets = NUM_BUCKETS_PER_DIMENSION * NUM_BUCKETS_PER_DIMENSION;
		const nFeatures = MAX_FEATURES_PER_BUCKET;
		/*
		if (!this.kernelCaches.applyPrune) {
		  const reductionKernels = [];
	
		  // to reduce to amount of data that need to sync back to CPU by 4 times, we apply this trick:
		  // the fact that there is not possible to have consecutive maximum/minimum, we can safe combine 4 pixels into 1
		  for (let k = 0; k < extremasResultsT.length; k++) {
			const extremaHeight = extremasResultsT[k].shape[0];
			const extremaWidth = extremasResultsT[k].shape[1];
	
			const kernel = {
				variableNames: ['extrema'],
				outputShape: [Math.floor(extremaHeight/2), Math.floor(extremaWidth/2)],
				userCode: `
					void main() {
						ivec2 coords = getOutputCoords();
						int y = coords[0] * 2;
						int x = coords[1] * 2;
	
						float location = 0.0;
						float values = getExtrema(y, x);
	
						if (getExtrema(y+1, x) != 0.0) {
							location = 1.0;
						values = getExtrema(y+1, x);
						}
						else if (getExtrema(y, x+1) != 0.0) {
							location = 2.0;
						values = getExtrema(y, x+1);
						}
						else if (getExtrema(y+1, x+1) != 0.0) {
							location = 3.0;
						values = getExtrema(y+1, x+1);
						}
	
						if (values < 0.0) {
							setOutput(location * -1000.0 + values);
						} else {
							setOutput(location * 1000.0 + values);
						}
					}
				`
			}
			reductionKernels.push(kernel);
		  }
		  this.kernelCaches.applyPrune = {reductionKernels};
		}
		*/
		// combine results into a tensor of:
		//   nBuckets x nFeatures x [score, octave, y, x]
		const curAbsScores = [];
		/** @type {number[][][]} */
		const result = [];
		for (let i = 0; i < nBuckets; i++) {
			result.push([]);
			curAbsScores.push([]);
			for (let j = 0; j < nFeatures; j++) {
				result[i].push([0, 0, 0, 0]);
				curAbsScores[i].push(0);
			}
		}

		tf.tidy(() => {
			//const {reductionKernels} = this.kernelCaches.applyPrune;

			for (let k = 0; k < extremasResultsT.length; k++) {
				//const program = reductionKernels[k];
				//const reducedT = this._compileAndRun(program, [extremasResultsT[k]]);
				const reducedT = tf.engine().runKernel('ExtremaReduction', { extremasResultT: extremasResultsT[k] });
				const octave = k + 1; // extrema starts from second octave

				const reduced = reducedT.arraySync();
				const height = reducedT.shape[0];
				const width = reducedT.shape[1];

				const bucketWidth = width * 2 / NUM_BUCKETS_PER_DIMENSION;
				const bucketHeight = height * 2 / NUM_BUCKETS_PER_DIMENSION;

				for (let j = 0; j < height; j++) {
					for (let i = 0; i < width; i++) {
						const encoded = reduced[j][i];
						if (encoded == 0) continue;


						const score = encoded % 1000;
						const loc = Math.floor(Math.abs(encoded) / 1000);
						const x = i * 2 + (loc === 2 || loc === 3 ? 1 : 0);
						const y = j * 2 + (loc === 1 || loc === 3 ? 1 : 0);

						const bucketX = Math.floor(x / bucketWidth);
						const bucketY = Math.floor(y / bucketHeight);
						const bucket = bucketY * NUM_BUCKETS_PER_DIMENSION + bucketX;

						const absScore = Math.abs(score);

						let tIndex = nFeatures;
						while (tIndex >= 1 && absScore > curAbsScores[bucket][tIndex - 1]) {
							tIndex -= 1;
						}

						if (tIndex < nFeatures) {
							for (let t = nFeatures - 1; t >= tIndex + 1; t--) {
								curAbsScores[bucket][t] = curAbsScores[bucket][t - 1];
								result[bucket][t][0] = result[bucket][t - 1][0];
								result[bucket][t][1] = result[bucket][t - 1][1];
								result[bucket][t][2] = result[bucket][t - 1][2];
								result[bucket][t][3] = result[bucket][t - 1][3];
							}
							curAbsScores[bucket][tIndex] = absScore;
							result[bucket][tIndex][0] = score;
							result[bucket][tIndex][1] = octave;
							result[bucket][tIndex][2] = y;
							result[bucket][tIndex][3] = x;
						}
					}
				}
			}
		});

		const list = [];
		for (let i = 0; i < nBuckets; i++) {
			for (let j = 0; j < nFeatures; j++) {
				list.push(result[i][j]);
			}
		}
		return list;
	}

	_buildExtremas(image0, image1, image2) {
		return tf.tidy(() => {
			return tf.engine().runKernel('BuildExtremas', { image0, image1, image2 });
		});
	}
	/**
	 * 
	 * @param {tf.Tensor<tf.Rank>} image1 
	 * @param {tf.Tensor<tf.Rank>} image2 
	 * @returns 
	 */
	_differenceImageBinomial(image1, image2) {
		return tf.tidy(() => {
			return image1.sub(image2);
		});
	}

	_applyFilter(image) {
		return tf.tidy(() => {
			return tf.engine().runKernel('BinomialFilter', { image });
		});
	}

	_downsampleBilinear(image) {
		return tf.tidy(() => {
			//const program = this.kernelCaches.downsampleBilinear[kernelKey];
			return tf.engine().runKernel("DownsampleBilinear", { image });//this._compileAndRun(program, [image]);

		});
	}
	/**
	 * 
	 * @param {tf.MathBackendWebGL.GPGPUProgram} program 
	 * @param {*} inputs 
	 * @returns 
	 */
	_compileAndRun(program, inputs) {
		const outInfo = tf.backend().compileAndRun(program, inputs);
		return tf.engine().makeTensorFromDataId(outInfo.dataId, outInfo.shape, outInfo.dtype);
	}

	_runWebGLProgram(program, inputs, outputType) {
		const outInfo = tf.backend().runWebGLProgram(program, inputs, outputType);
		return tf.engine().makeTensorFromDataId(outInfo.dataId, outInfo.shape, outInfo.dtype);
	}
}

export {
	Detector
};
