<div align="center">
  <h1>entangled-states</h1>
  <h4>[ <font color="red">ATENÇÃO! EM DESENVOLVIMENTO </font> ]</h4>
</div>

<div align="center">
  <h5><code>
  Solução de PubSub & RPC usando WebSocket e node.js para aplicações de baixa e média complexidade
  </code></h5>
</div>

<br>

<p align="center">
  <a href="https://badge.fury.io/js/entangled-states">
    <img src="https://badge.fury.io/js/entangled-states.svg"
        alt="npm version">
  </a>
  <a href="https://travis-ci.org/nidorx/entangled-states">
    <img src="https://travis-ci.org/nidorx/entangled-states.svg?branch=master"
        alt="Build Status">
  </a>
</p>

<br>

****

**entangled-states** é uma biblioteca que facilita o desenvolvimento de aplicações dinâmicas por meio dos padrões [publish–subscribe](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern) e [RPC](https://en.wikipedia.org/wiki/Remote_procedure_call) utilizando o protocolo [WebSocket](https://en.wikipedia.org/wiki/WebSocket).

<div align="center">
    <img
        src="https://github.com/nidorx/entangled-states/raw/master/doc/diagram.png"
        alt="Diagram" style="max-width:100%;">
</div>

## O que posso fazer com **entangled-states**

O **entangled-states** pode ser usado para integração de
* páginas Web/[PWA](https://developers.google.com/web/progressive-web-apps/)
* aplicativos Mobile com [React Native](https://facebook.github.io/react-native/)
* aplicativos Mobile com soluções baseadas em [WebView](https://ionicframework.com/docs/building/webview/) como [Ionic](https://ionicframework.com/) e aplicações geradas com uso do [Cordova](https://cordova.apache.org/)/[Phonegap](https://phonegap.com/)
* aplicações de backend usando Node.js

Com **entangled-states** você pode:

* Criar Publicador de conteúdo no servidor em Node.js que envia mensagem para um Tópico a partir da consulta feita em um Repositório de dados.
* A partir da Web, aplicativo Mobile ou Node.js, Assinar um Tópico, recebendo as atualizações de forma compactada.
* Disponibilizar Métodos no Servidor Node.js que podem ser invocados pelos Clientes, permitindo receber respostas Síncronas (com Promises) para essa ação [RPC]
* No Servidor, a qualquer momento, solicitar a publicação de novos dados de um Tópico.
* Utilizar MongoDB, PostgreSQL ou qualqer outro SGBD como [Repositório](https://github.com/nidorx/entangled-states#repository) de dados.
* Utilizar Midlewares para ter um controle fino sobre a execução de Ações e Publicadores, permitindo, por exemplo,  gerenciar Autenticação, Autorização de acesso ou Geração de Logs de execução.

## Conceitos

No padrão publish–subscribe, também conhecido como pub-sub, [Publicadores](https://github.com/nidorx/entangled-states#publisher) disponibilizam mensagens em [Tópicos](https://github.com/nidorx/entangled-states#topic), os [Assinantes](https://github.com/nidorx/entangled-states#subcriber) podem então assinar/subscrever nestes tópicos e processar as mensagens recebidas.

O padrão [RPC](https://en.wikipedia.org/wiki/Remote_procedure_call), Chamada Remota de Procedimento, acrônimo de *Remote Procedure Call* em inglês, permite que um Método (Action) do servidor possa ser invocado pelos Clientes.

### Repository
No **entangled-states** o repositório de dados é usado para obter os dados para publicação em um tópico e também persistir o versionamento das mensagens.

É um repositório de dados.  Existe uma implementação de repositório EM MEMÓRIA que é usado nos exemplos. Na documentação existe exemplos de criação de repositórios usando banco de dados Relacional (SQL) e até MongoDB.

O **entangled-states** define uma [classe genérica](https://github.com/nidorx/entangled-states/blob/master/src/lib/repository/Repository.ts) para os repositórios, permitindo ao desenvolvedor implementar seu proprio repositório usando qualquer banco de dados que lhe interessa. Um repositório possui a seguinte estrutura:

```ts
class Repository<T> {
   find(criteria: AnyObject, options: AnyObject): Promise<Array<T>>;
   count(criteria: AnyObject, options: AnyObject): Promise<number>;
   findOne(criteria: AnyObject, options: AnyObject): Promise<T>;
   insert(data: Partial<T>, options: AnyObject): Promise<T>;
   update(criteria: AnyObject, data: Partial<T>, options: AnyObject): Promise<number>;
   remove(criteria: AnyObject, options: AnyObject): Promise<number>;
}
```

Os parâmetros comuns aos métodos do repositório são:

| Parametro  | Descrição |
| --- | --- |
| criteria | Os filtros da consulta sendo realizada. Você tem a liberdade de usar qualquer estrutura que funcione com a sua implentação. |
| options | Pode ser usado pela sua implementação para passar configurações adicionais para uma query, como por exemplo, no MongoDB pode se passar [opções como o upsert](https://mongodb.github.io/node-mongodb-native/markdown-docs/insert.html#options). |


O **entangled-states** disponibiliza uma implementação de repositório em memória ( [`InMemoryRepository<T>`](https://github.com/nidorx/entangled-states/blob/master/src/lib/repository/InMemoryRepository.ts)), que pode ser usado para testes. 

**Exemplo Typescript/ES6**
```ts
import { InMemoryRepository } from 'entangled-states';

const DB_USERS = new InMemoryRepository();

DB_USERS.insert(data)
    .then((row) => { })
    .catch((cause) => { });
    
// ou
try {
    let row = await DB_USERS.insert(data);
} catch (cause) {
    
}
```

**Exemplo ES5**
```ts
var InMemoryRepository = require("entangled-states").InMemoryRepository;

const DB_USERS = new InMemoryRepository();

DB_USERS.insert(data)
    .then(function(row) { })
    .catch(function(cause) { });
```

### Topic
Como em outros sistemas pub-sub, os tópicos do **entangled-states** são os canais para transmitir mensagens de produtores para consumidores. O Tópico é o filtro de conteúdo que um cliente pode ter interesse em receber.

Existem dois tipos de tópicos **LIVRES** e **COM IDENTIFICADOR**. 
* Um tópico livre é usado para funcionalidades genéricas, como por exemplo, receber notificações sobre a criação de novos itens em uma coleção no servidor. 
* Já um tópico COM IDENTIFICADOR é usado para que o Cliente possa ser informado quando um item com identificador específico recebe atualizações, como por exemplo, em um sistema de e-comerce o cliente pode ser informado sobre a atualização do estoque ou preço de um produto específico.

O responsável pela criação dos tópicos, bem como a geração do seu conteúdo são os Publicadores.

### Publisher
Um Publicador é uma funcionalidade que permite disponibilizar o conteúdo de um Tópico. O Publicador utiliza um ou mais repositórios para consultar os dados que serão publicados. 

Para criar um novo tópico, basta configura-lo usando o método `create` da classe `Publishers`, conforme.:
```ts
import { Publishers } from 'entangled-states';

// Tópico livre
Publishers.create({
   topic: 'listagemDeAlgo',
   query: {
      repository: meuRepository
   }
});

// Tópicos com identificador (detalheDeItem#ID)
Publishers.create({
   topic: 'detalheDeItem',
   idRequired: true,
   query: {
      repository: meuRepository,
      params: {
         id: '$id'
      }
   }
});

// Tópicos com identificador usado para listar dados de uma categoria
Publishers.create({
   topic: 'listagemDeCategoria',
   idRequired: true,
   query: {
      repository: meuRepository,
      params: {
         idCategoria: '$id'
      }
   }
});
```

As configurações de um Publicador disponíveis são:

| Parametro | Tipo | Requerido | Descrição |
| --- | --- | --- | --- |
| topic | `string` | Sim | O nome do tópico que está sendo criado |
| query |  `QueryConfig` \| `Array<QueryConfig>` | Sim | A configuração da consulta usada para publicar o conteúdo deste tópico. (ver detalhamento abaixo) |
| idRequired | `boolean` | Não |  Informa que este Tópico é **COM IDENTIFICADOR** |
| then | `(lastResult: AnyObject) => void` | Não | Permite executar alguma outra funcionalidade após o envio da mensagem neste Tópico |

#### Query

Os dados publicados em um Tópico são provenientes da consulta em um ou mais repositórios. A consulta de um Publicador pode ser configurada usando os parametros abaixo.

| Parametro | Tipo | Requerido | Descrição |
| --- | --- | --- | --- |
| repository | `Repository<any>` | Sim | Repositório que possui os dados desejados nesta consulta |
| params | `AnyObject` | Não | Os parametros de consulta no store. Quando o Tópico é **COM IDENTIFICADOR** os parametros com valor = `$id` serão substituidos pelo identificador do tópico. Ex. `query:{ idCategoria : '$id' }`.  |
| options | `AnyObject` | Não | Permite configurar opções adicionais do [Repositório](https://github.com/nidorx/entangled-states#repository) usado |
| singleResult | `boolean` | Não | Permite definir se o resultado dessa consulta será um array ou uma entidade única. Se `TRUE` usará o método `findOne` do [Repositório](https://github.com/nidorx/entangled-states#repository), se `FALSE` usará o método `find`. O valor padrão é `FALSE`.  |
| filter | `(row: AnyObject, index: number, rows: Array<AnyObject>, prevResults: Array<any>) => boolean` | Não | Após consultar os dados, permite realizar um filtro em memória. **Não se aplica quando `singleResult=true`**  |
| forEach | `(row: AnyObject, index: number, rows: Array<AnyObject>, prevResults: Array<any>) => void` | Não | Após filtrar os registros, permite visitar cada um dos itens. **Não se aplica quando `singleResult=true`** |
| map | `(row: AnyObject, index: number, rows: Array<AnyObject>, prevResults: Array<any>) => any` | Não | Permite mapear o resultado para outra estrutura de dados diferente da disponibilizada pelo Repositório |
| extract | `(rows: Array<AnyObject>, prevResults: Array<any>) => AnyObject` | Não | Permite extrair um ÚNICO valor de saída, a partir dos resultado da Query atual e das Queries anteriores. |


**Exemplo complexo**
No exemplo abaixo, é feito a criação de um tópico que entrega diversas informações sobre uma categoria de produtos a partir do ID (Obviamente esse exemplo pode ser substituído por apenas um repositório com os filtros desejados, mas o exemplo é apenas para demonstrar a aplicação de multiplas queries em um tópico).

```ts
// Publica detalhamento de uma categoria 
Publishers.create({
    topic: 'detalhesCategoria',
    idRequired: true,
    query: [
        {  // traz filhos da categoria solicitada
            repository: CATEGORIA_REPO,
            params: {
                categoriaPai: '$id'
            },
            // filtra categorias ativas
            filter: (row, index, rows, prevResults) => {
                return row.ativo === true;
            }
        },
        {  // conta produtos na categoria solicitada
            repository: CONTA_PRODUTOS_REPO,
            singleResult: true,
            params: {
                idCategoria: '$id'
            }
        },
        {  // detalhes da categoria solicitada
            repository: CATEGORIA_REPO,
            singleResult: true,
            params: {
                idCategoria: '$id'
            },
            extract: (rows, prevResults) => {
                let filhos: Array<Categoria> = prevResults[0];
                let contaProdutos: ContaProduto = prevResults[1][0]; // [1][0] = prevResult 1, item 0
                return {
                    ...rows[0], //   singleResult: true
                    totalProdutos: contaProdutos.total,
                    filhos: filhos
                }
            }
        }
   ]
});
```

### Compressão
A transfência das mensagens entre Cliente e Servidor é feito de forma compactada, usando um algoritmo de [Delta Encoding](https://en.wikipedia.org/wiki/Delta_encoding) ([diff & patch](https://en.wikipedia.org/wiki/Diff)) que garante o transporte apenas da diferença existente entre os dados conhecidos pelo cliente com os novos dados publicados no servidor, diminuindo o consumo de banda e latencia. 

### Server

Sua aplicação Node.js. No servidor serão criados os publicadores de conteúdo e os métodos de ação. Nele também serão criados os repositórios de acesso aos dados. 

### Client
Sua aplicação consumidora dos dados disponibilizados pelo servidor. Pode ser uma aplicação WEB, aplicativo Mobile ou até mesmo um outro servidor Node.js. O cliente pode se inscrever (SUBSCRIBER) para receber atualizações em um tópico ou até mesmo executar métodos disponibilizados pelo servidor.

## Porque e Quando usar isso?

Porque é legal :)

O **entangled-states** vai te ajudar se:

1. A principal necessidade da sua aplicação é receber atualizações em tempo real de forma ágil e leve
2. Sua aplicação não é do tamanho do Facebook (VEJA LIMITAÇÕES ABAIXO)
3. Você deseja padronizar/reutilizar o mecanismo de comunicação em páginas WEB, Aplicativo Mobile e Servidor
4. Você deseja diminuir consideravelmente o tamanho e quantidade de dados trafegados entre cliente e servidor por meio do algoritmo de compactação e delta implementado nessa solução

## Limitações

* Não permite (ainda) escalar para múltiplos servidores ou cores. Sua aplicação será single core.
* Não dá suporte (ainda) a WebSocket binário (ArrayBuffer). A transferência dos dados (compactados e delta) é somente do tipo Texto. 
* Se estiver desenvolvendo páginas WEB, saiba que o motor de busca do [Google não entende WebSocket](https://developers.google.com/search/docs/guides/rendering#websocket), portanto, fazer uso exclusivamente de WebSocket para renderizar o conteúdo de sua página vai prejudicar [as suas otimizações para mecanismos de busca - SEO](https://pt.wikipedia.org/wiki/Otimiza%C3%A7%C3%A3o_para_motores_de_busca)
 

## @TODO
* Permitir escalar (sistema distribuido)
* Permitir [Multi Tenancy](https://en.wikipedia.org/wiki/Multitenancy)
* Permitir transferencia binária 