import '../node_modules/aframe/dist/aframe-v1.7.0.js';
import '../node_modules/mind-ar/dist/mindar-image-aframe.prod.js';

document.addEventListener("DOMContentLoaded", function() {
	const sceneEl = document.querySelector('a-scene');
	let arSystem;
	sceneEl.addEventListener('loaded', function () {
	  arSystem = sceneEl.systems["mindar-image-system"];
	});
	const exampleTarget = document.querySelector('#example-target');
	const examplePlane = document.querySelector('#example-plane');
	const startButton = document.querySelector("#example-start-button");
	const stopButton = document.querySelector("#example-stop-button");
	const pauseButton = document.querySelector("#example-pause-button");
	const pauseKeepVideoButton = document.querySelector("#example-pause-keep-video-button");
	const unpauseButton = document.querySelector("#example-unpause-button");
	//const slides = sceneEl.querySelectorAll(".slides");
	startButton.addEventListener('click', () => {
	  console.log("start");
	  arSystem.start(); // start AR 
	});
	stopButton.addEventListener('click', () => {
	  arSystem.stop(); // stop AR 
	});
	pauseButton.addEventListener('click', () => {
	  arSystem.pause(); // pause AR, pause video
	});
	pauseKeepVideoButton.addEventListener('click', () => {
	  arSystem.pause(true); // pause AR, keep video
	});
	unpauseButton.addEventListener('click', () => {
	  arSystem.unpause(); // unpause AR and video
	});
	// arReady event triggered when ready
	sceneEl.addEventListener("arReady", (event) => {
	  // console.log("MindAR is ready")
	});
	// arError event triggered when something went wrong. Mostly browser compatbility issue
	sceneEl.addEventListener("arError", (event) => {
	  // console.log("MindAR failed to start")
	});
	// detect target found
	//exampleTarget.addEventListener("targetFound", event => {
	  //console.log("target found");
	//});
	// detect target lost
	//exampleTarget.addEventListener("targetLost", event => {
	  //console.log("target lost");
	//});
	// detect click event
	// examplePlane.addEventListener("click", event => {
    //     const color = examplePlane.getAttribute("color")
    //     if(color == "blue"){
	//         examplePlane.setAttribute("color","red")
    //     }
    //     else{
    //         examplePlane.setAttribute("color","blue")
    //     }
	// });
//VERIFICAR SE VAI DAR PROBLEMA SE NAO TIVER ARROW KEY ------------------------------------------
	document.querySelectorAll(".left-arrow").forEach(el => {
		el.addEventListener("click", () => {
			const slides = document.querySelectorAll(".slides");
		let currentIndex = 0;
		for (let i = 0; i < slides.length; i++) {
			if (slides[i].getAttribute("visible") == true) {
				currentIndex = i;
				break;
			}
		}
		console.log("crrent index = ", currentIndex);
		slides[currentIndex].setAttribute("visible", false);
		if (currentIndex == 0) {
			currentIndex = slides.length - 1;
		}
		else {	
			currentIndex--;
		}
		slides[currentIndex].setAttribute("visible", true);
		
	});
	});

	document.querySelectorAll(".right-arrow").forEach(el => {
		el.addEventListener("click", () => {
		const slides = document.querySelectorAll(".slides");
		let currentIndex = 0;
		for (let i = 0; i < slides.length; i++) {
			if (slides[i].getAttribute("visible") == true) {
				currentIndex = i;
				break;
			}
		}
		console.log("crrent index = ", currentIndex);
		slides[currentIndex].setAttribute("visible", false);
		if (currentIndex == slides.length - 1) {
			currentIndex = 0;
		}
		else {
			currentIndex++;
		}
		slides[currentIndex].setAttribute("visible", true);
		
		console.log(slides.length);
	});
	});
});