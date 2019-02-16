<div align="center">
  <h1>websocket-pubsub</h1>
  <h4>[ <font color="red">ATENÇÃO! EM DESENVOLVIMENTO </font> ]</h4>
</div>

<div align="center">
  <h5><code>
  Solução de PubSub & RPC usando WebSocket e node.js para aplicações de baixa e média complexidade
  </code></h5>
</div>

<br>

<p align="center">
  <a href="https://badge.fury.io/js/websocket-pubsub">
    <img src="https://badge.fury.io/js/websocket-pubsub.svg"
        alt="npm version">
  </a>
  <a href="https://travis-ci.org/nidorx/websocket-pubsub">
    <img src="https://travis-ci.org/nidorx/websocket-pubsub.svg?branch=master"
        alt="Build Status">
  </a>
</p>

<br>

****

**websocket-pubsub** é uma biblioteca que tem o objetivo de facilitar o desenvolvimento de aplicações dinâmicas por meio dos padrões [pub-sub/ Publish–Subscribe ](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern) com [Tópicos](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern#Message_filtering) e [RPC](https://en.wikipedia.org/wiki/Remote_procedure_call) utilizando o protocolo [WebSocket](https://en.wikipedia.org/wiki/WebSocket).

A transfência das mensagens entre Cliente e Servidor é feito de forma compactada, usando um algoritmo de [Delta Encoding](https://en.wikipedia.org/wiki/Delta_encoding) ([diff & patch](https://en.wikipedia.org/wiki/Diff)) que garante o transporte apenas da diferença existente entre os dados conhecidos pelo cliente com os novos dados publicados no servidor, diminuindo o consumo de banda e latencia.   

O **websocket-pubsub** pode ser usado em páginas Web/[PWA](https://developers.google.com/web/progressive-web-apps/), aplicativos Mobile ([React Native](https://facebook.github.io/react-native/) e soluções baseadas em [WebView](https://ionicframework.com/docs/building/webview/) [como [Ionic](https://ionicframework.com/) e aplicações geradas com uso do [Cordova](https://cordova.apache.org/)/[Phonegap](https://phonegap.com/)]) e integração entre servidores Node.js.

## O que posso fazer com **websocket-pubsub**

* Criar publicador de conteúdo (PUBLISHER) no servidor (node.js) que envia mensagem para um tópico (TOPIC) a partir de uma busca em um repositório.
* A partir da Web, Aplicativo Mobile ou Node.js, ouvir (SUBSCRIBER) as mensagens envidadas para um Tópico, recebendo as atualizações de forma compactada.
* Disponibilizar métodos (ACTION) no servidor que podem ser invocados pelos clientes (Web, Mobile, Node.js), permitindo receber respostas Síncronas (com Promises) para essa ação [RPC]
* No servidor, a qualquer momento e fluxo, solicitar a publicação de novos dados de um Tópico cadastrado.
* Atualizar página Web ou Aplicativos Mobile sempre que uma atualização ocorra no servidor por meio do padrão PubSub
* Utilizar MongoDB, PostgreSQL ou qualqer outro tipo de repositório de dados, até mesmo repositório EM MEMÓRIA.
* Adicionar Midlewares nas Actions ou Publishers para ter um controle fino sobre a execução, permitindo, por exemplo,  gerenciar Autenticação, Autorização de acesso ou Geração de Logs de execção.

## Arquitetura

Abaixo está disponível todas as funcionalidades/componentes existentes no **websocket-pubsub**

* **Server** Sua aplicação Node.js. No servidor serão criados os publicadores de conteúdo e os métodos de ação. Nele também serão criados os repositórios de acesso aos dados. 
* **Client** Sua aplicação consumidora dos dados disponibilizados pelo servidor. Pode ser uma aplicação WEB, aplicativo Mobile ou até mesmo um outro servidor Node.js. O cliente pode se inscrever (SUBSCRIBER) para receber atualizações em um tópico ou até mesmo executar métodos disponibilizados pelo servidor.
* **Repository** É um repositório de dados. O **websocket-pubsub** define a interface genérica para os repositórios, permitindo ao desenvolvedor implementar seu proprio repositório usando qualquer banco de dados que lhe interesse. Existe uma implementação de repositório EM MEMÓRIA que é usado nos exemplos. Na documentação existe exemplos de criação de repositórios usando banco de dados Relacional (SQL) e até MongoDB.
* **Publisher** Suas implementações de publicadores de conteúdo nos tópicos. Um publicador de conteúdo utiliza um ou mais repositórios para consultar os dados que serão publicados. Para tópicos com ID, o publicador recebe este parametro durante a consulta.
* **Topic** O tópico é o filtro de conteúdo que um cliente pode ter interesse em receber. O cliente faz a inscrição em um tópico. Os tópicos são alimentados pelos publicadores. Existem dois tipos de tópicos **LIVRES** e **COM IDENTIFICADOR**. Um tópico livre é usado para funcionalidades genéricas, como por exemplo, receber notificações sobre a criação de novos itens em uma coleção no servidor. Já um tópico COM IDENTIFICADOR é usado para que o cliente possa ser informado quando um item com identificador específico recebe atualizações, como por exemplo, em um sistema de e-comerce o cliente pode ser informado sobre a atualização do estoque ou preço de um produto específico.

<div align="center">
    <img
        src="https://github.com/nidorx/websocket-pubsub/raw/master/doc/diagram.png"
        alt="Diagram" style="max-width:100%;">
</div>


## Porque e Quando usar isso?

Porque é legal :)

O **websocket-pubsub** vai te ajudar se:

1. A principal necessidade da sua aplicação é receber atualizações em tempo real de forma ágil e leve
2. Sua aplicação não é do tamanho do Facebook (VEJA LIMITAÇÕES ABAIXO)
3. Você deseja padronizar/reutilizar o mecanismo de comunicação em páginas WEB, Aplicativo Mobile e Servidor
4. Você deseja diminuir consideravelmente o tamanho e quantidade de dados trafegados entre cliente e servidor por meio do algoritmo de compactação e delta implementado nessa solução

## Limitações

* Não permite (ainda) escalar para múltiplos servidores ou cores. Sua aplicação será single core.
* Não dá suporte (ainda) a WebSocket binário (ArrayBuffer). A transferência dos dados (compactados e delta) é somente do tipo Texto. 
* Se estiver desenvolvendo páginas WEB, saiba que o motor de busca do [Google não entende WebSocket](https://developers.google.com/search/docs/guides/rendering#websocket), portanto, fazer uso exclusivamente de WebSocket para renderizar o conteúdo de sua página vai prejudicar [as suas otimizações para mecanismos de busca - SEO](https://pt.wikipedia.org/wiki/Otimiza%C3%A7%C3%A3o_para_motores_de_busca)




 
