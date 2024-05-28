import { batch, createSignal, type Component } from "solid-js"
import { createStore, produce, unwrap } from "solid-js/store"
import { DownloadButtons } from "./components/Button"
import { TaskCreatePanel, PanelState } from "./components/Panel"
import { TaskSnackbarHost, DownloadTask } from "./components/Snackbar"

const App: Component = () => {
  const [panelState, setPanelState] = createSignal<PanelState>()
  const [panelVisible, setPanelVisible] = createSignal(false)
  const [tasks, setTasks] = createStore<DownloadTask[]>([])
  const addTask = (task: DownloadTask) => {
    setTasks(tasks.length, task)
  }
  const deleteTask = (index: number) => {
    setTasks(
      produce((tasks) => {
        tasks.splice(index, 1)
      }),
    )
  }
  const restartTask = (index: number) => {
    const task = unwrap(tasks)[index]!
    deleteTask(index)
    addTask(task)
  }
  const showPanel = (panelState: PanelState) => {
    batch(() => {
      setPanelState(panelState)
      setPanelVisible(true)
    })
  }

  return (
    <>
      <DownloadButtons
        onClick={(courseTitle) => {
          const fullName =
            document
              .querySelector(".course-intro-title")
              ?.textContent?.trim() ?? "未知课程"
          const courseName = fullName.substring(0, fullName.indexOf("("))
          // console.log("Download", courseName, courseTitle)
          showPanel({ courseName, title: courseTitle })
        }}
      />
      <TaskCreatePanel
        visible={panelVisible()}
        uiState={panelState()}
        onClose={() => {
          setPanelVisible(false)
        }}
        onCreate={(task) => {
          console.log("Create", task)
          setPanelVisible(false)
          addTask(task)
        }}
      />
      <TaskSnackbarHost
        tasks={tasks}
        onComplete={deleteTask}
        onRetry={restartTask}
      />
    </>
  )
}

export default App
