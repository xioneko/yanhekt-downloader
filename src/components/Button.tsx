import {
  Component,
  createSignal,
  For,
  onMount,
  ParentComponent,
} from "solid-js"
import { Portal } from "solid-js/web"
import downloadSVG from "@assets/icons/download.svg"

export const DownloadButtons: Component<{
  onClick: (courseTitle: string) => void
}> = (props) => {
  const [courseNodes, setCourseNodes] = createSignal<Node[]>([])
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  onMount(async () => {
    const courseListEl = await getCourseListElAsync()

    setCourseNodes(Array.from(courseListEl.children))

    listenItemsMutation(courseListEl, (mutations) => {
      setCourseNodes((prev) => {
        const removed: Node[] = []
        for (const { addedNodes, removedNodes } of mutations) {
          // console.log(addedNodes, removedNodes)
          prev.push(...Array.from(addedNodes))
          removed.push(...Array.from(removedNodes))
        }
        return prev.filter((node) => !removed.includes(node))
      })
    })
  })

  return (
    <div>
      <For each={courseNodes()}>
        {(node) => (
          <Portal mount={node}>
            <DownloadButton
              onClick={() => {
                const title = (node as HTMLElement).querySelector(
                  "h4 > span:nth-child(1)",
                )?.textContent
                if (!title) {
                  console.error("Title not found", node)
                  return
                }
                props.onClick(title)
              }}
            >
              下载
            </DownloadButton>
          </Portal>
        )}
      </For>
    </div>
  )
}

const DownloadButton: ParentComponent<{
  onClick?: (ev: MouseEvent) => void
}> = (props) => {
  return (
    <button
      type="button"
      class="ant-btn ant-btn-round ant-btn-primary inline-flex items-center gap-[6px]"
      onClick={(ev) => props.onClick?.(ev)}
    >
      <img width="14" src={downloadSVG} alt="download" />
      <span class="hidden! md:inline!">{props.children}</span>
    </button>
  )
}

function getCourseListElAsync() {
  return new Promise<HTMLElement>((resolve) => {
    const _ = setInterval(() => {
      const elem = document.querySelector(
        ".course-detail .ant-list-items",
      ) as HTMLElement
      if (elem) {
        clearInterval(_)
        resolve(elem)
      }
    }, 500)
  })
}

let observer: MutationObserver

function listenItemsMutation(
  courseListEl: HTMLElement,
  onChange: (mutations: MutationRecord[]) => void,
) {
  observer = new MutationObserver((mutations) => {
    console.log("Mutation")
    onChange(mutations)
  })
  observer.observe(courseListEl, { childList: true })
}
