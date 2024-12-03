import { createEngine } from "../../shared/engine.js"

const { renderer, input, math, run, finish, audio } = createEngine()
const { ctx, canvas } = renderer


const ambienceSound = await audio.load({
    src: "assets/loop.mp3",
    loop: true
})
const ambienceSoundInst = ambienceSound.play()

const impactSound = await audio.load("assets/impact.mp3")
run(update)

function update(dt) {

    if (input.isDown()) {
        impactSound.play({
            rate: 1 + Math.random() * 1,
            volume: 0.5 + Math.random() * 0.5
        })
    }

    ambienceSoundInst.setRate(input.getX() / canvas.width)
    ambienceSoundInst.setVolume(input.getY() / canvas.height)
}
