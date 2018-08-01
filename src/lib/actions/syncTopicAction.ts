
import Topic from "../Topic";
import Actions from "../Actions";
import { SyncTopicParams } from "../Constants";
import Publishers from "../Publishers";

/**
 * Permite ao cliente sincronizar a informação sobre a ultima mensagem recebida no tópico
 */
Actions.register('syncTopic', (info: SyncTopicParams, ws, accept) => {
   const topic = Topic.find(info.topic);
   if (topic) {
      topic.subscribe(ws, info.seq);

      // Solicita a publicação no tópico, para garantir que o usuário já receba a versão mais recente
      const parts = info.topic.split('#');
      Publishers.publish(parts[0], parts[1]);
   }

   accept();
});
