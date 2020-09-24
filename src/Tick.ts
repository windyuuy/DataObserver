namespace vm {

    export class Tick {
        protected static temp: Watcher[] = [];
        protected static errorTemp: Watcher[] = [];
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
                try {
                    w.run();
                } catch (e) {
                    console.error(e)
                    this.errorTemp.push(w);
                }
            }

            if (this.errorTemp.length > 0) {
                for (let w of this.errorTemp) {
                    this.queue.push(w);//失败的表达式将每帧重复执行
                }
            }

            temp.length = 0;
            this.errorTemp.length = 0;
        }

    }


}