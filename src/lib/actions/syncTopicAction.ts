
import Topic from "../Topic";
import Actions from "../Actions";
import { SyncTopicParams } from "../Constants";

/**
 * Permite ao cliente sincronizar a informação sobre a ultima mensagem recebida no tópico
 */
Actions.register('syncTopic', (data: SyncTopicParams, ws, accept) => {
   const topic = Topic.find(data.topic);
   if (topic) {
      topic.subscribe(ws, data.seq);
   }

   accept();
});
