namespace vm {

    export class Tick {
        protected static temp: Watcher[] = [];
        static queue: Watcher[] = [];
        static queueMap: IIdMap = new IdMap();

        static add(w: Watcher) {
            if (!this.queueMap.has(w.id)) {
                this.queueMap.add(w.id);
                this.queue.push(w);
            }
        }

        static next() {
            this.queueMap.clear();
            const temp = this.queue;
            this.queue = this.temp;
            this.temp = temp;

            for (let w of temp) {
                w.run();
            }

            temp.length = 0;
        }

    }


}