import {
  type Component,
  For,
  JSX,
  Match,
  ParentComponent,
  Switch,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js"
import { CourseVideo, downloadVideo, fetchCourseVideos } from "../lib/course"
import { convertTsToMp4 } from "../lib/ffmpeg"
import downloadingSVG from "@assets/icons/downloading.svg"
import errorSVG from "@assets/icons/error.svg"
import processingSVG from "@assets/icons/processing.svg"
import waitingSVG from "@assets/icons/waiting.svg"
import finishedSVG from "@assets/icons/finished.svg"
import cloudDownloadSVG from "@assets/icons/cloud-download.svg"
import cancelSVG from "@assets/icons/cancel.svg"
import retrySVG from "@assets/icons/retry.svg"
import { createListTransition } from "@solid-primitives/transition-group"
import { resolveElements } from "@solid-primitives/refs"

export interface DownloadTask {
  courseId: string
  courseName: string
  courseTitle: string
  videoType: "vga" | "main"
  autoTranscode: boolean
}

let courseVideos: CourseVideo[] // lazy load
const FlexColumnGap = 12

export const TaskSnackbarHost: Component<{
  tasks: DownloadTask[]
  onComplete: (index: number) => void
  onRetry: (index: number) => void
}> = (props) => {
  return (
    <div
      style={{
        gap: `${FlexColumnGap}px`,
      }}
      class="fixed bottom-[24px] right-[24px] flex flex-col-reverse"
    >
      <TransitionGroup>
        <For each={props.tasks}>
          {(task, index) => {
            return (
              <TaskSnackbar
                task={task}
                onComplete={() => {
                  props.onComplete(index())
                }}
                onRetry={() => {
                  props.onRetry(index())
                }}
              ></TaskSnackbar>
            )
          }}
        </For>
      </TransitionGroup>
    </div>
  )
}

const TransitionGroup: ParentComponent = (props) => {
  const transition = createListTransition(
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
    resolveElements(() => props.children).toArray,
    /* eslint-enable */
    {
      exitMethod: "keep-index",
      onChange({ added, removed, finishRemoved }) {
        ;(added as HTMLElement[]).forEach((el) => {
          el.style.opacity = "0"
          el.style.transform = "translateY(-24px)"
          // 渲染 DOM 之前
          setTimeout(() => {
            el.style.transition = "all 0.4s ease-out"
            el.style.opacity = "1"
            el.style.transform = "none"
          })
        })
        ;(removed as HTMLElement[]).forEach((el) => {
          el.style.transition = "all 0.3s ease-out"
          el.style.opacity = "0"
          el.style.transform = "translateX(-24px)"
          el.style.marginTop = `-${el.clientHeight + FlexColumnGap}px`
          el.addEventListener(
            "transitionend",
            () => {
              finishRemoved([el])
            },
            { once: true },
          )
        })
      },
    },
  )
  return <>{transition()}</>
}

type TaskSnackbarState =
  | TaskSnackbarState.Waiting
  | TaskSnackbarState.Downloading
  | TaskSnackbarState.Finished
  | TaskSnackbarState.Transcoding
  | TaskSnackbarState.Error
namespace TaskSnackbarState {
  export interface Waiting {
    status: "waiting"
    type: "download" | "transcode"
  }
  export interface Downloading {
    status: "downloading"
    progress: number
  }
  export interface Finished {
    status: "finished"
    blobUrl: string
  }
  export interface Transcoding {
    status: "transcoding"
    progress: number
  }
  export interface Error {
    status: "error"
    type: "download" | "transcode" | "cancelled"
    message: string
  }
}

export const TaskSnackbar: Component<{
  task: DownloadTask
  onComplete: () => void
  onRetry: () => void
}> = (props) => {
  const [state, setState] = createSignal<TaskSnackbarState>({
    status: "waiting",
    type: "download",
  })
  let abortDownload: (() => void) | undefined // lazy init
  let abortTranscoding: (() => void) | undefined // lazy init
  const cancel = () => {
    abortDownload?.()
    abortTranscoding?.()
    props.onComplete()
  }

  void (async function download() {
    try {
      const url = await resolveVideoUrl()
      const tsBlob = await startDownloading(url)
      let resultBlob = tsBlob
      if (props.task.autoTranscode) {
        resultBlob = await startTranscoding(tsBlob)
      }
      setState({ status: "finished", blobUrl: URL.createObjectURL(resultBlob) })
    } catch (error) {
      /* handled by each process function */
    }

    async function resolveVideoUrl() {
      if (!courseVideos) {
        try {
          courseVideos = await fetchCourseVideos(props.task.courseId)
          console.log(courseVideos)
        } catch (err) {
          console.log("%c[Downloading]", "color: red", err)
          setState({
            status: "error",
            type: "download",
            message: "获取课程视频地址失败",
          })
        }
      }
      const {
        videos: [videoDetail],
      } = courseVideos.find(
        (course) => course.title === props.task.courseTitle,
      )!
      const { vga: vgaUrl, main: mainUrl, format } = videoDetail!
      if (format !== "m3u8") {
        setState({
          status: "error",
          type: "download",
          message: "不支持下载当前课程视频",
        })
        throw new Error("不支持的视频格式")
      }

      const url = props.task.videoType === "vga" ? vgaUrl : mainUrl
      return url
    }

    async function startDownloading(url: string) {
      try {
        const [tsBlob, cancel] = downloadVideo(url, (progress) => {
          setState({ status: "downloading", progress })
        })
        abortDownload = cancel
        return await tsBlob
      } catch (error) {
        console.log("%c[Downloading]", "color: red", error)
        if (error instanceof DOMException && error.name === "AbortError") {
          setState({
            status: "error",
            type: "cancelled",
            message: "下载已取消",
          })
        } else {
          setState({
            status: "error",
            type: "download",
            message: "下载错误",
          })
        }
        throw error
      }
    }

    async function startTranscoding(tsBlob: Blob) {
      setState({ status: "waiting", type: "transcode" })
      try {
        const [mp4Blob, cancel] = convertTsToMp4(
          tsBlob,
          console.debug,
          (progress) => {
            setState({ status: "transcoding", progress })
          },
        )
        abortTranscoding = cancel
        return await mp4Blob
      } catch (error) {
        console.log("%c[Transcoding]", "color: red", error)
        if (error instanceof DOMException && error.name === "AbortError") {
          setState({
            status: "error",
            type: "cancelled",
            message: "转码已取消",
          })
        } else {
          setState({
            status: "error",
            type: "transcode",
            message: "转码错误",
          })
        }
        throw error
      }
    }
  })()

  return (
    <div class="snackbar">
      <Switch>
        <Match when={state().status == "waiting"}>
          <SnackbarScaffold
            iconUrl={waitingSVG}
            title={props.task.courseTitle}
            description={`等待${
              (state() as TaskSnackbarState.Waiting).type === "download"
                ? "下载"
                : "转码"
            }...`}
            color="gray"
            progress={0}
            actionIconUrl={cancelSVG}
            onActionClick={cancel}
          />
        </Match>
        <Match when={state().status == "downloading"}>
          <SnackbarScaffold
            iconUrl={downloadingSVG}
            title={props.task.courseTitle}
            description="下载中..."
            color="#699AE4"
            progress={(state() as TaskSnackbarState.Downloading).progress}
            actionIconUrl={cancelSVG}
            onActionClick={cancel}
          />
        </Match>
        <Match when={state().status == "finished"}>
          <SnackbarScaffold
            iconUrl={finishedSVG}
            title={props.task.courseTitle}
            description="已完成"
            color="#69E48B"
            progress={1}
            actionIconUrl={cloudDownloadSVG}
            onActionClick={() => {
              const blobUrl = (state() as TaskSnackbarState.Finished).blobUrl
              const a = document.createElement("a")
              a.href = blobUrl
              a.download = `[${props.task.courseName}] ${props.task.courseTitle} [${
                props.task.videoType === "main" ? "教室" : "投影"
              }]${props.task.autoTranscode ? ".mp4" : ".ts"}`
              a.click()
              onCleanup(() => {
                URL.revokeObjectURL(blobUrl)
              })
            }}
          />
        </Match>
        <Match when={state().status == "transcoding"}>
          <SnackbarScaffold
            iconUrl={processingSVG}
            title={props.task.courseTitle}
            description="转码中..."
            color="#69E4DD"
            progress={(state() as TaskSnackbarState.Transcoding).progress}
            actionIconUrl={cancelSVG}
            onActionClick={cancel}
          />
        </Match>
        <Match when={state().status == "error"}>
          <SnackbarScaffold
            iconUrl={errorSVG}
            title={props.task.courseTitle}
            description={(state() as TaskSnackbarState.Error).message}
            color="#E46969"
            progress={1}
            actionIconUrl={retrySVG}
            onActionClick={props.onRetry}
          />
        </Match>
      </Switch>
    </div>
  )
}

const SnackbarScaffold: Component<{
  iconUrl: string
  title: string
  description: string
  color: string
  progress: number
  actionIconUrl: string
  onActionClick: () => void
}> = (props) => {
  const [fade, setFade] = createSignal(true)
  onMount(() => {
    setTimeout(() => {
      setFade(false)
    })
  })
  return (
    <div class="relative h-[64px] w-[288px] flex items-center justify-between gap-[12px] overflow-hidden rounded-[6px] bg-white px-[12px] py-[16px] shadow-md">
      <img
        classList={{
          "opacity-0": fade(),
        }}
        src={props.iconUrl}
        alt=""
        class="h-full transition-opacity duration-300"
      />
      <div class="flex flex-1 flex-col justify-between overflow-hidden">
        <div class="w-full overflow-hidden text-ellipsis break-keep text-[0.9em] text-[#333]">
          {props.title}
        </div>
        <div class="select-none text-[0.8em] opacity-75">
          {props.description}
        </div>
      </div>
      <div class="h-full flex items-center">
        <ActionButton
          onClick={props.onActionClick}
          class="h-3/5 cursor-pointer border-none bg-transparent p-0 active:brightness-90 hover:brightness-110"
        >
          <img src={props.actionIconUrl} alt="" class="h-full" />
        </ActionButton>
      </div>
      <div
        style={{
          width: `${props.progress * 100}%`,
          background: props.color,
        }}
        class="absolute bottom-0 left-0 h-[3px] rounded-[2px]"
      ></div>
    </div>
  )
}

const ActionButton: ParentComponent<{
  class: string
  onClick: () => void
}> = (props) => {
  return (
    <button
      type="button"
      class={props.class}
      onClick={() => {
        props.onClick()
      }}
    >
      {props.children}
    </button>
  )
}
