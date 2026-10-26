import { mount } from 'svelte'
import App from './App.svelte'
// Palette, dark overrides and the editor theme all come from the appearance
// plugin; the shell only consumes the tokens.
import { applyAppearance, studioAppearance } from '@shirone-studio/plugin-appearance'
import './app.css'

// Apply before mounting so the first paint already uses the palette instead of
// flashing unstyled and then re-theming once the context is built.
applyAppearance([studioAppearance])

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
