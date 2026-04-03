import './style.css'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')

if (typeof window !== 'undefined' && window.parent !== window) {
  let frameHeight = 0
  let scheduled = false

  const getContentHeight = () => {
    const app = document.getElementById('app')
    return Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight,
      app?.scrollHeight ?? 0
    )
  }

  const postHeight = () => {
    scheduled = false
    const nextHeight = Math.ceil(getContentHeight())

    if (!nextHeight || nextHeight === frameHeight) {
      return
    }

    frameHeight = nextHeight
    window.parent.postMessage(
      {
        type: 'proleadsai:iframe-resize',
        height: nextHeight,
      },
      '*'
    )
  }

  const scheduleHeightPost = () => {
    if (scheduled) {
      return
    }

    scheduled = true
    window.requestAnimationFrame(postHeight)
  }

  window.addEventListener('load', scheduleHeightPost)
  window.addEventListener('resize', scheduleHeightPost)

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleHeightPost).catch(() => {})
  }

  const resizeObserver = new ResizeObserver(scheduleHeightPost)
  resizeObserver.observe(document.documentElement)
  resizeObserver.observe(document.body)

  const mutationObserver = new MutationObserver(scheduleHeightPost)
  mutationObserver.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
  })

  scheduleHeightPost()
  window.setTimeout(scheduleHeightPost, 150)
  window.setTimeout(scheduleHeightPost, 500)
}
