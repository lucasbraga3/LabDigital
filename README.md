# LabDigital – Plataforma Web de Realidade Aumentada Educacional

## Visão Geral do Projeto

O **LabDigital** é um sistema web de Realidade Aumentada (RA) desenvolvido para uso no ensino superior, permitindo integrar conteúdos virtuais interativos em aulas tradicionais. A plataforma possibilita que **professores** façam upload de imagens de slides (ou PDFs inteiros de apresentações) e associem a elas materiais virtuais – como modelos 3D ou imagens interativas – que serão exibidos em RA aos **alunos** durante a aula. Os estudantes, por sua vez, podem apontar seus **dispositivos móveis** (smartphones ou tablets) para os slides do professor e visualizar, em tempo real, objetos virtuais sobrepostos à imagem do slide físico, diretamente na tela do dispositivo. Essa abordagem torna as aulas mais dinâmicas e visa **facilitar o aprendizado** por meio da interatividade proporcionada pela RA, aumentando o engajamento e a retenção de conteúdo pelos alunos. Em suma, o LabDigital funciona como um complemento às metodologias tradicionais, trazendo recursos de RA de forma acessível (apenas com o navegador web, dispensando aplicativos dedicados) e alinhada às práticas pedagógicas existentes.

## Tecnologias Utilizadas

O projeto utiliza um conjunto de tecnologias web modernas, tanto no front-end (cliente) quanto no back-end (servidor), integradas para viabilizar a experiência de RA de forma eficiente. Abaixo estão as principais tecnologias empregadas e uma breve descrição de cada uma:

- **Node.js & Express.js:** Node.js é a plataforma de servidor JavaScript utilizada no back-end, e o framework Express.js provê a estrutura para criar uma API RESTful e roteamento de requisições. No LabDigital, o servidor Node/Express gerencia uploads de arquivos (imagens, PDFs, modelos 3D), processa esses arquivos e serve o conteúdo de RA para os clientes. Ele também lida com a lógica de negócio, como geração dinâmica de páginas HTML de RA e integração com cache.
- **React (Front-end):** Biblioteca JavaScript para construção de interfaces de usuário reativas. Foi utilizada para criar a interface web do LabDigital, permitindo que professores façam upload de seus materiais e visualizem prévias interativas de RA. A interface em React aprimora a experiência do usuário, tornando o processo de configuração das experiências de RA mais amigável e intuitivo.
- **A-Frame & Three.js:** A-Frame é um framework de código aberto baseado em HTML/Entity-Component para desenvolver experiências imersivas de RA/VR no navegador. Internamente, ele utiliza o Three.js, uma biblioteca 3D em JavaScript, para renderizar os gráficos 3D via WebGL. No LabDigital, o A-Frame simplifica a criação das cenas AR – por exemplo, posicionando um modelo 3D sobre um marcador – enquanto o Three.js executa a renderização dos modelos e animações de forma performática.
- **mindAR.js:** Biblioteca JavaScript especializada em RA **marker-based** (baseada em imagens) para web. É o núcleo do sistema de RA do LabDigital, responsável por reconhecer e rastrear em tempo real as imagens-alvo (ex.: figuras dos slides) capturadas pela câmera do dispositivo, e por possibilitar a sobreposição de conteúdos virtuais alinhados a essas imagens. O mindAR.js utiliza algoritmos de visão computacional e aprendizado de máquina (via TensorFlow\.js) para detectar os padrões visuais dos marcadores e manter o alinhamento dos objetos 3D mesmo com movimento da câmera.
- **TensorFlow\.js:** Biblioteca de *machine learning* em JavaScript. No contexto do LabDigital, é utilizada em conjunto com o mindAR.js para tarefas de reconhecimento visual e tracking de imagens. O TensorFlow\.js permite que modelos de detecção executem diretamente no navegador, aproveitando aceleração por GPU via WebGL, o que viabiliza o rastreamento de imagens de forma rápida e em tempo real.
- **PDF2Pic & GraphicsMagick:** Conjunto de ferramentas para processamento de arquivos PDF e conversão em imagens. O PDF2Pic é um pacote Node.js que, em combinação com a biblioteca *GraphicsMagick* (ou ImageMagick), converte cada página de um PDF em imagens (bitmaps). No LabDigital, isso é usado para permitir que um professor envie um PDF de slides e o sistema extraia automaticamente cada página como imagem de alta qualidade. Essas imagens passam a ser utilizadas como marcadores AR (targets) – cada slide torna-se um alvo reconhecível pela câmera, ao qual conteúdos 3D podem ser vinculados.
- **WebGL:** Tecnologia base para renderização 3D em navegadores, utilizada implicitamente via Three.js/A-Frame. O WebGL permite que gráficos 3D e animações sejam exibidos de forma acelerada pela GPU diretamente no navegador, sem necessidade de plugins. Graças a ele, o LabDigital consegue mostrar modelos 3D complexos sobre os slides com desempenho adequado em dispositivos modernos.
- **Axios:** Biblioteca HTTP cliente utilizada no front-end (e potencialmente no back-end) para realizar requisições assíncronas. Por exemplo, o front-end em React usa Axios para enviar os arquivos (imagens, PDFs, modelos) ao servidor Node através da API REST e para consultar resultados (como o retorno das páginas convertidas do PDF). É uma forma simplificada de integrar o front-end com as rotas do back-end de forma segura e baseada em promessas.
- **Multer:** Middleware para Node.js utilizado no processamento de *upload* de arquivos via Express. Ele lida com formulários multipart/form-data, permitindo ao LabDigital aceitar envios de PDFs, imagens e modelos 3D através da interface web de forma simples. Com o Multer, os arquivos enviados pelos professores são automaticamente salvos em locais temporários para posterior processamento (conversão de PDF, otimização de modelo, etc.).
- **Redis:** Banco de dados *in-memory* do tipo chave-valor, utilizado como cache de alta performance. No LabDigital, o Redis armazena temporariamente as imagens geradas a partir dos PDFs (em formato Base64) e possivelmente metadados das experiências. Ao cachear as imagens dos slides e outros assets em memória, o sistema reduz a latência nas requisições seguintes – por exemplo, vários alunos solicitando o mesmo conteúdo AR simultaneamente – aliviando a carga do servidor e acelerando a entrega. A integração do Redis também contribui para a escalabilidade da aplicação, facilitando a distribuição de carga entre múltiplas instâncias do servidor.
- **Opossum.js (Circuit Breaker):** Biblioteca para implementação do padrão *circuit breaker* em aplicações Node.js. Embora não seja tão evidente ao usuário final, o LabDigital incorpora o Opossum para melhorar a resiliência do sistema. Esse componente monitora chamadas externas potencialmente falhas (por exemplo, processamento de imagens ou acessos a recursos de terceiros) e, em caso de falhas repetidas, pode “abrir o circuito” temporariamente para evitar sobrecarregar o sistema com tentativas inúteis. Isso melhora a robustez, impedindo que falhas em cadeia derrubem o serviço durante, por exemplo, um processamento pesado de PDF.

*(Obs.: Além das tecnologias listadas, diversas bibliotecas utilitárias e padrões de projeto foram adotados conforme necessidade – por exemplo, otimização de modelos 3D com bibliotecas como **meshoptimizer**, compressão de texturas ASTC, entre outras técnicas de preparação de assets mencionadas no TCC – para garantir que os conteúdos em RA carreguem rapidamente e sejam compatíveis com dispositivos móveis.)*

## Requisitos de Sistema

Para instalar e executar o LabDigital localmente, certifique-se de que o ambiente atenda aos seguintes
requisitos mínimos:

- Node.js (versão 14 ou superior) instalado no sistema, juntamente com o gerenciador de pacotes
  NPM (normalmente incluído com o Node) ou Yarn. O Node é necessário para rodar o servidor back
  end e realizar o processamento de arquivos.
- Redis – é recomendado ter uma instância do Redis rodando localmente (porta padrão 6379) caso
  deseje aproveitar o cache em memória. Sem o Redis, o sistema ainda pode funcionar, porém
  possivelmente com menor eficiência. Instale o Redis conforme as instruções do site oficial para seu
  sistema operacional.
- GraphicsMagick e Ghostscript – necessários para a funcionalidade de conversão de PDFs em
  imagens via PDF2Pic/GraphicsMagick. O GraphicsMagick trata da manipulação de imagens, e o
  Ghostscript é geralmente utilizado internamente para interpretar o conteúdo PDF. Instale ambos e
  verifique se os executáveis (gm e gs) estão acessíveis pelo PATH do sistema.
- Navegador Web Compatível – Qualquer navegador moderno com suporte a WebGL/WebXR (por
  exemplo, Chrome, Firefox, Safari atualizados). Para a experiência completa de RA, um dispositivo
  com câmera é necessário. Recomenda-se uso de smartphones modernos (Android ou iOS) ou
  notebooks com webcam. Em dispositivos iOS, é necessário usar o Safari ou um navegador WebKit, e
  no Android, Chrome ou Firefox funcionam bem. Observação: Para que o acesso à câmera funcione
  em dispositivos móveis, pode ser exigido hospedar a interface via HTTPS ou em localhost, devido às
  políticas de segurança dos navegadores móveis.
- Plataforma – O LabDigital é multiplataforma, podendo ser executado em servidores ou PCs com
  Windows, Linux ou macOS. Contudo, a conversão de PDF e ferramentas gráficas podem exigir
  ajustes específicos por sistema (ex.: no Windows, garantir a instalação adequada do Ghostscript e
  GraphicsMagick; em Linux, usar gerenciador de pacotes para instalá-los).

(Opcionalmente, caso pretenda modificar ou extender a interface front-end em React, será necessário ter o
Node.js instalado também para gerenciar o ambiente de desenvolvimento front-end e construir os arquivos
estáticos. Este requisito se aplica se houver um diretório ou repositório separado para o front-end em React.)

## Instruções de Instalação e Execução

Siga os passos abaixo para instalar as dependências do projeto e executar o LabDigital em modo de
desenvolvimento local, incluindo tanto o servidor back-end quanto a interface front-end:

1. Obter o código-fonte: Clone este repositório ou faça o download do código do LabDigital (via ZIP)
   para o seu computador. Se estiver usando Git, execute:
   bash
   git clone <https://github.com/lucasbraga3/LabDigital.git>
2. Instalar dependências do back-end: Abra um terminal na pasta do projeto (por exemplo,
   LabDigital/Server). Certifique-se de estar dentro do diretório Server, onde reside o código
   Node.js do servidor. Execute:
   bash
   npm install
   Isso irá ler o arquivo package.json e baixar os pacotes necessários (Express, pdf2pic, mindAR, etc).
3. Configurar variáveis de ambiente (se necessário): O servidor pode já estar
   configurado para usar certas portas ou conexões padrão. Verifique se há arquivo .env ou configurações
   no código que precisem ser ajustadas – como porta do servidor (default: 3000) ou endereço do Redis.
4. Executar o servidor: No diretório Server, inicie a aplicação com:
   bash
   npm start ou node server.js

   O servidor deverá conectar-se ao Redis (se configurado) e disponibilizar a API e interface web.
5. Instalar/compilar o front-end (se aplicável): Caso o projeto inclua um diretório de front-end separado
   (ex: pasta frontend, se usando React), entre nela e execute:
   bash
   npm install
   npm start

   No repositório atual, há uma interface web simples em JS puro em VanillaJs, já integrada ao servidor –
   portanto, não é necessária instalação adicional para essa versão.
6. Acessar a aplicação: Com o servidor rodando, acesse no navegador:
      <http://localhost:3000>
  
   Professores podem começar a fazer upload de conteúdos. Se estiver usando um dispositivo móvel,
   acesse http://<IP-da-máquina>:3000 e assegure-se de estar na mesma rede. Para liberar câmera em
   dispositivos móveis, pode ser necessário usar HTTPS (ex: via ngrok).
7. Uso da interface (fluxo básico): Acesse a opção de upload, envie uma imagem ou PDF (marcador),
   associe um modelo 3D (.glb, .gltf), imagem ou outro conteúdo AR. O servidor processará o arquivo
   (conversão de PDF, otimização do modelo, etc.) e armazenará o conteúdo.
8. Visualizar o conteúdo em RA: Após cadastrar um marcador + conteúdo, clique em “Visualizar em RA”.
   O navegador pedirá permissão para usar a câmera. Aponte para o slide físico/projetado e o conteúdo
   será exibido.
9. Interação durante a aula: Durante a aula, os alunos com a aplicação aberta em seus celulares
   poderão ver os conteúdos RA sobre os slides em tempo real. A experiência é multiusuário e
   simultânea.
10. Encerrando o servidor: Para encerrar, pressione Ctrl+C. Uploads permanecem conforme
   implementação (cache Redis ou disco). Limpe arquivos temporários regularmente para economizar
   espaço.

(Dica: prepare os conteúdos com antecedência. PDFs muito extensos podem demorar para converter, e
modelos pesados podem afetar a performance em celulares modestos.)

## Estrutura do Projeto

A estrutura de diretórios e arquivos do repositório LabDigital é organizada de forma a separar as
responsabilidades do back-end e do front-end, facilitando a manutenção e a compreensão do código. A
seguir, uma breve descrição das principais pastas e arquivos do projeto:

- Server/ – Diretório principal do código back-end (Node.js/Express). Contém os arquivos fonte do
  servidor que implementam a API REST e as funcionalidades de processamento:
  - app.js ou server.js – Arquivo de entrada do servidor Node que inicializa o Express, configura
    as rotas e inicia a escuta na porta configurada.
  - routes/ – Pasta (se existente) com módulos definindo as rotas da API (por exemplo, rotas para
    upload de arquivos, para servir páginas AR, etc.). Cada rota pode estar separada em arquivos como uploadRoutes.js, contentRoutes.js, etc.
  - controllers/ ou services/ – Código responsável pela lógica de negócio: por exemplo,
    funções para converter PDF em imagens, otimizar e servir modelos 3D, integração com
    mindAR (geração do código HTML/AR), e chamadas ao Redis.
  - models/ – (Opcional) Poderia conter definições de modelos de dados se houvesse um banco de
    dados persistente. No LabDigital, não há banco relacional – os “modelos” referem-se a arquivos 3D.
  - public/ – Diretório de conteúdo estático servido pelo Express (páginas web, scripts, assets).
    Importante: builds do front-end ou arquivos HTML/JS estáticos podem ser colocados aqui.
  - package.json – Arquivo de manifesto do Node.js listando as dependências do back-end
    (por exemplo, express, axios, mind-ar, pdf2pic, etc.), scripts de execução e build.

- VanillaJs/ – Diretório contendo a implementação front-end simples em HTML/CSS/JS puro.
  Esta pasta inclui:
  - index.html – Página principal com a-scene do A-Frame e componentes do mindAR.
  - main.js ou app.js – Script que configura comunicação com o back-end e inicia o tracking AR.
  - style.css – Estilos básicos da interface.
  - Arquivos externos: bibliotecas mindAR/A-Frame/Three.js, carregados via CDN ou localmente.

- README.md – Documentação principal (este arquivo).
- LICENSE.md – Licença MIT do projeto.
- .gitignore – Lista de arquivos/pastas ignoradas pelo Git (node_modules/, public/, configs, etc).
- (Possível) frontend/ – Caso evolua para uma interface em React, diretório separado com os
  componentes React, package.json próprio e scripts de build.

Em resumo, a raiz do projeto separa claramente o servidor (lógica de negócio, API, processamento) da
interface do usuário (arquivos estáticos servidos ao navegador para interação e visualização da RA).
Essa separação segue boas práticas de desenvolvimento web, permitindo que cada parte possa ser
trabalhada independentemente – por exemplo, substituir a interface VanillaJS por um front-end React sem
modificar o core do servidor, desde que as APIs permaneçam consistentes.

## Exemplos de Uso e Como Testar

A seguir, são descritos alguns cenários de uso do LabDigital e instruções de teste para você ver o sistema
em ação:

- Upload de uma Imagem e Modelo 3D (Caso simples): Suponha que um professor queira explicar o
  modelo de um átomo durante a aula. Ele tem um slide com a imagem de um diagrama atômico.
  Usando o LabDigital, o professor acessa a interface web e faz upload dessa imagem do diagrama
  (como marcador). Em seguida, faz upload de um modelo 3D de um átomo (formato .glb) e o
  associa àquele marcador. Quando estiver em sala de aula, ao projetar o slide com o diagrama, os
  alunos irão abrir a página AR do LabDigital em seus celulares, apontar para o slide e visualizar o
  modelo 3D do átomo “flutuando” sobre o diagrama. Eles podem aproximar o celular para ver
  detalhes ou andar em volta do slide para observar o modelo de diferentes ângulos, tornando o
  conceito abstrato mais concreto e exploratório.
- Uso de PDF com Múltiplos Slides: Em um cenário mais avançado, o professor pode enviar um
  arquivo PDF contendo toda a apresentação da aula. O sistema então converte cada página do PDF
  em uma imagem (cada slide vira um marcador). O professor pode então associar diferentes
  conteúdos a cada slide – por exemplo, no Slide 5 que fala sobre motor de carro, associar um modelo
  3D de um motor; no Slide 8 sobre circuito elétrico, associar uma animação ou imagem interativa do
  circuito. Quando os alunos apontarem seus dispositivos para cada um desses slides específicos,
  verão o conteúdo correspondente em RA. Como testar: você pode usar um PDF curto (por exemplo, 3
  páginas) e um conjunto de três modelos 3D simples. Faça o upload do PDF, espere o processamento
  (cada página aparecerá listada na interface talvez), então para cada página selecione um modelo 3D
  para associar. Inicie a visualização AR e navegue pelos slides impressos ou na tela – conforme você
  muda o slide, o conteúdo exibido no celular também muda para o respectivo modelo 3D daquele
  slide. Esse exemplo demonstra o potencial do LabDigital em encadear múltiplas experiências RA
  em uma única aula de forma organizada.
- Conteúdos de RA em Diferentes Formatos: O LabDigital aceita não apenas modelos 3D, mas
  também imagens ou outros elementos como conteúdo AR. Por exemplo, um professor de história
  pode querer exibir uma fotografia histórica ou um vídeo curto quando o aluno apontar para uma
  imagem específica no material didático. Para testar, você pode associar uma imagem PNG/JPEG
  como conteúdo AR: ao detectar o marcador, a aplicação exibirá essa imagem adicional sobre o
  material original. Da mesma forma, é possível vincular vídeos ou áudio (embora não explicitamente
  mencionado, a tecnologia webAR permite reprodução de mídia) – por exemplo, apontar para a foto
  de um cientista no slide e tocar um áudio com uma citação dele. A arquitetura do LabDigital é
  extensível a novos tipos de mídia interativa, bastando desenvolver os componentes adequados no
  front-end para exibí-los.
- Demonstração Local Rápida: Para fins de desenvolvimento ou apresentação, você pode testar o
  LabDigital utilizando dois dispositivos: use seu computador pessoal como servidor e também para
  exibir o “marcador” em tela cheia, e um celular como visor AR. Por exemplo, abra o slide (imagem
  alvo) no monitor do PC. No celular, acesse a página AR do LabDigital (via IP do computador). Ao
  apontar a câmera do celular para o monitor, o sistema reconhecerá a imagem e exibirá o modelo 3D
  sobre ela no próprio celular. Isso facilita o teste mesmo se você não tiver uma versão impressa do
  slide em mãos.
- Limitações a considerar durante os testes: Lembre-se que a RA baseada em imagem tem algumas
  limitações físicas: é preciso ter iluminação adequada no ambiente para que a câmera capte bem o
  marcador. Se o sistema tiver dificuldade em reconhecer, tente melhorar a luz ou o contraste da
  imagem. Além disso, não mova o dispositivo muito rápido; dê tempo para o algoritmo de tracking
  realinhar o conteúdo. Em dispositivos mais antigos, pode haver queda de FPS se muitos objetos
  estiverem na cena – nesse caso, teste com menos objetos ou modelos mais leves. O LabDigital já
  implementa otimizações automáticas (redução de polígonos, compressão de texturas) para mitigar
  isso, mas é sempre bom ter em mente o poder de processamento do dispositivo em uso.

## Licença

Este projeto é de código aberto e está licenciado sob a MIT License (Licença MIT). Isso significa que
você tem permissão para usar, copiar, modificar, mesclar, publicar e distribuir livremente o código, contanto
que mantenha a atribuição aos autores originais e inclua uma cópia da licença MIT em quaisquer
redistribuições. Em resumo, a licença MIT é permissiva e incentiva a reutilização do LabDigital tanto em
contextos acadêmicos quanto comerciais, desde que sejam respeitadas as condições de direitos autorais
mencionadas no arquivo LICENSE do repositório.

## Contribuições

Contribuições são bem-vindas! Sendo um projeto acadêmico e open-source, o LabDigital pode se beneficiar
da ajuda da comunidade para evoluir e se tornar ainda mais robusto. Se você deseja contribuir:

- Reporte Bugs ou Sugestões: Utilize a seção de Issues do GitHub para relatar problemas, bugs
  encontrados ou propor novas funcionalidades/melhorias. Descreva com detalhes o comportamento
  esperado e o observado, ou a ideia de aprimoramento, para que possamos reproduzir e discutir a
  melhor solução.
- Envie Pull Requests: Sinta-se livre para fazer um fork do repositório, implementar correções ou
  novas features, e então abrir um Pull Request explicando as mudanças. Vamos revisar o código e
  interagir nos comentários. Por exemplo, melhorias no front-end, tradução da interface para outros
  idiomas, inclusão de novos tipos de conteúdo AR, entre outros, são contribuições potenciais.
- Siga o estilo do projeto: Tente seguir a organização de código existente. Mantenha separada a
  lógica do front-end e back-end, documente seu código e inclua comentários quando necessário para
  explicar partes complexas (como processamento de imagem ou otimizações).
- Teste suas alterações: sempre teste as funcionalidades que você modificar/adicionar, tanto
  isoladamente quanto integradas ao fluxo principal (uploads, reconhecimento AR, etc.), garantindo
  que não quebrem nada existente. Se possível, adicione exemplos ou atualize o README com
  informações relevantes às novas features.

Ao contribuir, você ajuda a expandir o alcance do LabDigital, possivelmente adaptando-o para outras áreas
do conhecimento ou melhorando sua performance e usabilidade. Agradecemos desde já o interesse em
colaborar com o projeto!

## Contato

Este projeto foi desenvolvido originalmente por Lucas Braga e Thiago Medeiros, como parte de seu
Trabalho de Conclusão de Curso em Ciência da Computação (UFRRJ, 2025). Para entrar em contato com os
autores e mantenedores do LabDigital, você pode usar os seguintes meios:

- GitHub: Abra uma issue no repositório ou mencione os autores (@lucasbraga3) em discussões
  relacionadas ao projeto. O GitHub é o canal preferencial para suporte técnico e dúvidas, pois
  permite o acompanhamento público das questões.
- E-mail: Embora não fornecido explicitamente aqui, os autores possivelmente disponibilizaram
  contato via e-mail em sua documentação acadêmica. Verifique no PDF do TCC ou no perfil do GitHub
  deles se há um e-mail profissional listado.
- LinkedIn ou Outros: Caso os autores tenham perfis públicos, entrar em contato por redes
  profissionais pode ser uma opção (buscando por Lucas Braga UFRRJ ou Thiago Medeiros UFRRJ).

Se você for um educador ou pesquisador interessado em implementar o LabDigital em sua instituição de
ensino, sinta-se à vontade para nos contatar. Estamos abertos a feedbacks, parcerias e troca de
experiências sobre RA educacional. O objetivo do projeto é justamente disseminar a tecnologia e aprender
com seu uso em diferentes contextos, então toda forma de interação construtiva é bem-vinda
