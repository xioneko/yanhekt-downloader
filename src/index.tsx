import { render } from "solid-js/web"
import App from "./App"
import "virtual:uno.css"

const root = document.createElement("div")
document.body.appendChild(root)
render(() => <App />, root)
