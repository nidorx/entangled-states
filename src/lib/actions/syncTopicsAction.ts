
import Topic from "../Topic";
import Actions from "../Actions";
import Publishers from "../Publishers";

interface SyncTopicParams {
   topic: string;
   lastReceivedSeq: number;
}

/**
 * Atualiza os registro do ws nos tópicos informados. 
 * 
 * Remove dos outros tópicos (para que o usuário não receba mensagens desnecessárias)
 * 
 * Faz também o controle de criação de tópicos. Alguns tópicos são dinamicos. Ex. avaliacao_candidato#<ID_DO_CANDIDATO>
 */
Actions.register('syncTopics', (data: Array<SyncTopicParams>, ws, accept) => {
   // Criação de novos tópicos, se necessário
   data.forEach(item => {
      // Se não existir, será instanciado
      Topic.find(item.topic);
   });

   // Registra ou Remove o usuário dos tópicos
   Topic.ALL.forEach(topic => {
      const info = data.find(item => item.topic === topic.getName());
      if (info) {
         // Atualiza o cliente no tópico
         topic.subscribe(ws, info.lastReceivedSeq);

         // Solicita a republicação no tópico
         let parts = info.topic.split('#');

         Publishers.publish(parts[0], parts[1]);
      } else {
         // Cliente não está mais nessa lista
         topic.unsubscribe(ws);
      }
   });

   accept();
});
