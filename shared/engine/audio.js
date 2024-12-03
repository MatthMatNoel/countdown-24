
export function createAudio() {

    const ctx = new AudioContext();

    async function resumeContext() {

        if (ctx.state === "suspended") {
            await ctx.resume()
        }
    }

    window.addEventListener("click", resumeContext)
    window.addEventListener('touchstart', resumeContext, { capture: true });


    /**
     * @typedef LoadOptionsFull
     * @type {object}
     * @property {string} src
     * @property {boolean} loop
     * 
     * @typedef {string|LoadOptionsFull} LoadOptions
     * 
     * @param {LoadOptions} opts 
    */
    async function load(opts) {

        opts = typeof opts === "string" ? { src: opts } : opts

        const response = await fetch(opts.src);
        const bufferData = await response.arrayBuffer()
        const buffer = await ctx.decodeAudioData(bufferData);

        let isPlaying = false
        let isLooping = opts.loop ?? false

        /**
         * @type {AudioBufferSourceNode[]}
         */
        const instances = []


        /**
         * @typedef PlayOptionsFull
         * @type {object}
         * @property {number|undefined} volume
         * @property {number|undefined} rate
         * @property {number|undefined} loop
         * 
         * @typedef {string|PlayOptionsFull} PlayOptions
         * 
         * @param {PlayOptions} opts 
        */
        function play(opts) {

            if (isPlaying)
                return

            opts = opts ??= {}

            const gainNode = ctx.createGain()

            const bufferSource = ctx.createBufferSource()
            bufferSource.buffer = buffer
            bufferSource.loop = isLooping
            bufferSource.loopStart = 0
            bufferSource.loopEnd = buffer.duration
            bufferSource.addEventListener("ended", e => {
                instances.splice(instances.indexOf(bufferSource))
            })
            bufferSource.start()

            bufferSource.connect(gainNode).connect(ctx.destination);

            instances.push(bufferSource)

            setRate(opts.rate ?? 1)
            setVolume(opts.volume ?? 1)

            function setRate(/** @type {number} */ rate) {

                bufferSource.playbackRate.value = rate
            }
            function setVolume(/** @type {number} */ volume) {

                gainNode.gain.value = volume
            }

            return {

                setRate,
                setVolume
            }
        }

        const snd = {

            buffer,
            play,
            isPlaying: () => instances.length > 0
        }
        return snd
    }

    return {
        load
    }
}