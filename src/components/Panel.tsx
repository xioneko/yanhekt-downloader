import {
  type Accessor,
  createContext,
  createSignal,
  onCleanup,
  onMount,
  type ParentComponent,
  Show,
  useContext,
  type Component,
  createEffect,
  batch,
} from "solid-js"
import type { DownloadTask } from "./Snackbar"
import closeSVG from "@assets/icons/close.svg"

export type PanelState = {
  courseName: string
  title: string
}

export const TaskCreatePanel: Component<{
  visible: boolean
  uiState?: PanelState
  onClose: () => void
  onCreate: (task: DownloadTask) => void
}> = (props) => {
  const [fade, setFade] = createSignal(true)
  const [scale, setScale] = createSignal(true)

  return (
    <AnimatedVisibility
      visible={props.visible}
      onEnter={() => {
        setFade(false)
        setScale(false)
      }}
      onExit={() => {
        setFade(true)
        setScale(true)
      }}
    >
      <div
        class="fixed top-0 z-24 h-full w-full flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ease-out"
        classList={{
          "opacity-0": fade(),
        }}
        onClick={() => {
          props.onClose()
        }}
      >
        <div
          class="relative w-[288px] flex flex-col items-center gap-[16px] rounded-[6px] bg-white px-[15px] py-[20px] transition-transform duration-300 ease-out"
          classList={{
            "scale-90": scale(),
          }}
          onClick={(ev) => {
            ev.stopPropagation()
          }}
        >
          <img
            src={closeSVG}
            alt="close"
            class="absolute right-[10px] top-[10px] h-[20px] cursor-pointer hover:brightness-110"
            onClick={() => {
              props.onClose()
            }}
          />
          <div class="text-[1.2em] text-[#0f86ff]">创建下载任务</div>
          <form
            class="w-full flex flex-col items-center"
            onSubmit={(ev) => {
              ev.preventDefault()
              const formData = new FormData(ev.currentTarget)
              const path = window.location.pathname
              const courseId = path.substring(path.lastIndexOf("/") + 1)
              props.onCreate({
                courseName: props.uiState!.courseName,
                courseId: courseId,
                videoType: formData.get("type") as "vga" | "main",
                courseTitle: props.uiState!.title,
                autoTranscode: formData.get("autoTranscode") === "on",
              })
            }}
          >
            <FormItem label="课程名称">
              <span class="overflow-hidden text-ellipsis whitespace-nowrap">
                {props.uiState!.courseName}
              </span>
            </FormItem>
            <FormItem label="课程节次">
              <span class="overflow-hidden text-ellipsis whitespace-nowrap">
                {props.uiState!.title}
              </span>
            </FormItem>
            <FormItem label="录像类型">
              <RadioButtonGroup name="type">
                <RadioButton label="投影" value="vga" checked />
                <RadioButton label="教室" value="main" />
              </RadioButtonGroup>
            </FormItem>
            <FormItem label="自动转码">
              <RadioButtonGroup name="autoTranscode">
                <RadioButton label="是" value="on" />
                <RadioButton label="否" value="off" checked />
              </RadioButtonGroup>
            </FormItem>
            <button
              class="ant-btn ant-btn-primary ant-btn-background-ghost mt-[4px]"
              type="submit"
            >
              创建
            </button>
          </form>
        </div>
      </div>
    </AnimatedVisibility>
  )
}

const AnimatedVisibility: ParentComponent<{
  visible: boolean
  onEnter?: () => void
  onExit?: () => void
}> = (props) => {
  const [visible, setVisible] = createSignal(false)
  createEffect(() => {
    if (props.visible) {
      setVisible(true)
      setTimeout(() => {
        batch(() => {
          props.onEnter?.()
        })
      })
    } else {
      props.onExit?.()
    }
  })

  return (
    <Show when={visible()}>
      <div
        onTransitionEnd={() => {
          if (!props.visible) {
            setVisible(false)
          }
        }}
      >
        {props.children}
      </div>
    </Show>
  )
}

const FormItem: ParentComponent<{
  label: string
}> = (props) => {
  return (
    <div class="mb-[16px] w-full flex flex-row items-center gap-[12px]">
      <label class="flex-shrink-0 flex-basis-[72px] text-right text-[#666]">
        {props.label}
        <span class="select-none">:</span>
      </label>
      <div class="flex gap-[12px] overflow-hidden">{props.children}</div>
    </div>
  )
}

const RadioGroupContext = createContext<{
  value: Accessor<string | undefined>
  forwardRef: (ref: HTMLInputElement) => void
}>()

const RadioButtonGroup: ParentComponent<{
  name: string
}> = (props) => {
  const [value, setValue] = createSignal<string>()
  const radioRefs: HTMLInputElement[] = []
  const forwardRef = (ref: HTMLInputElement) => {
    radioRefs.push(ref)
  }
  const listenChange = (ev: Event) => {
    const target = ev.target as HTMLInputElement
    if (target.checked) {
      setValue(target.value)
    }
  }
  onMount(() => {
    radioRefs.forEach((radio) => {
      radio.name = props.name
      if (radio.checked) setValue(radio.value)
      radio.addEventListener("change", listenChange)
    })
  })
  onCleanup(() => {
    radioRefs.forEach((radio) => {
      radio.removeEventListener("change", listenChange)
    })
  })
  return (
    <RadioGroupContext.Provider
      value={{
        value,
        forwardRef,
      }}
    >
      <div class="ant-radio-group ant-radio-group-outline">
        {props.children}
      </div>
    </RadioGroupContext.Provider>
  )
}

const RadioButton: Component<{
  label: string
  value: string
  checked?: boolean
}> = (props) => {
  const { value, forwardRef } = useContext(RadioGroupContext)!
  return (
    <label
      class="ant-radio-wrapper"
      classList={{
        "ant-radio-wrapper-checked": value?.() === props.value,
      }}
    >
      <span
        class="ant-radio"
        classList={{
          "ant-radio-checked": value?.() === props.value,
        }}
      >
        <input
          ref={forwardRef}
          type="radio"
          class="ant-radio-input"
          checked={props.checked ?? false}
          value={props.value}
        />
        <span class="ant-radio-inner"></span>
      </span>
      <span>{props.label}</span>
    </label>
  )
}
