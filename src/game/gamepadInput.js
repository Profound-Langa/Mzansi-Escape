const AXIS_DEADZONE = 0.25
const UI_AXIS_DEADZONE = 0.6
const BUTTON_THRESHOLD = 0.5
const FOCUSABLE_SELECTOR =
  'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [role="button"]:not([aria-disabled="true"])'

function isPressed(button) {
  return Boolean(button?.pressed || button?.value > BUTTON_THRESHOLD)
}

export function getConnectedGamepads() {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return []
  }
  return Array.from(navigator.getGamepads()).filter((gamepad) => gamepad?.connected)
}

export function getPreferredGamepad(gamepads = getConnectedGamepads()) {
  return gamepads.find((gamepad) => gamepad.mapping === 'standard') ?? gamepads[0] ?? null
}

export function isGamepadButtonPressed(gamepad, buttonIndex) {
  return Boolean(
    gamepad?.connected && isPressed(gamepad.buttons?.[buttonIndex])
  )
}

export function getGamepadKeyCodes(gamepad) {
  if (!gamepad?.connected) return new Set()

  const codes = new Set()
  const axes = gamepad.axes ?? []
  const buttons = gamepad.buttons ?? []
  const horizontal = axes[0] ?? 0
  const vertical = axes[1] ?? 0

  if (vertical < -AXIS_DEADZONE || isPressed(buttons[12])) codes.add('KeyW')
  if (vertical > AXIS_DEADZONE || isPressed(buttons[13])) codes.add('KeyS')
  if (horizontal < -AXIS_DEADZONE || isPressed(buttons[14])) codes.add('KeyA')
  if (horizontal > AXIS_DEADZONE || isPressed(buttons[15])) codes.add('KeyD')
  if (isPressed(buttons[0])) codes.add('Space')
  if (isPressed(buttons[1])) codes.add('KeyC')
  if (isPressed(buttons[2])) codes.add('KeyE')
  if (isPressed(buttons[3])) codes.add('KeyQ')
  if (
    isPressed(buttons[4]) ||
    isPressed(buttons[5]) ||
    isPressed(buttons[6]) ||
    isPressed(buttons[7])
  ) {
    codes.add('ShiftLeft')
  }
  if (isPressed(buttons[10])) codes.add('ShiftLeft')
  if (isPressed(buttons[11])) codes.add('Space')
  if (isPressed(buttons[9])) codes.add('Escape')

  return codes
}

export function syncGamepadKeyboardInput(previousCodes, enabled = true) {
  const gamepad = getPreferredGamepad()
  const nextCodes = enabled ? getGamepadKeyCodes(gamepad) : new Set()

  for (const code of previousCodes) {
    if (nextCodes.has(code)) continue
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }))
  }

  for (const code of nextCodes) {
    if (previousCodes.has(code)) continue
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }))
  }

  return nextCodes
}

export function getGamepadUiDirection(gamepad) {
  if (!gamepad?.connected) return null
  const axes = gamepad.axes ?? []
  const buttons = gamepad.buttons ?? []
  const horizontal = axes[0] ?? 0
  const vertical = axes[1] ?? 0

  if (horizontal < -UI_AXIS_DEADZONE || isPressed(buttons[14])) return 'left'
  if (horizontal > UI_AXIS_DEADZONE || isPressed(buttons[15])) return 'right'
  if (vertical < -UI_AXIS_DEADZONE || isPressed(buttons[12])) return 'up'
  if (vertical > UI_AXIS_DEADZONE || isPressed(buttons[13])) return 'down'
  return null
}

function getFocusableElements() {
  return Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    const style = window.getComputedStyle(element)
    return (
      element.getClientRects().length > 0 &&
      element.tabIndex >= 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none'
    )
  })
}

export function navigateGamepadFocus(direction) {
  const elements = getFocusableElements()
  if (elements.length === 0) return
  const activeIndex = elements.indexOf(document.activeElement)
  const step = direction === 'up' || direction === 'left' ? -1 : 1
  const nextIndex =
    activeIndex < 0
      ? step < 0
        ? elements.length - 1
        : 0
      : (activeIndex + step + elements.length) % elements.length
  elements[nextIndex].focus({ preventScroll: true })
  elements[nextIndex].scrollIntoView?.({ block: 'nearest' })
}

export function activateGamepadFocus() {
  const activeElement = document.activeElement
  const elements = getFocusableElements()
  if (!elements.includes(activeElement)) {
    elements[0]?.click()
    return
  }
  if (activeElement instanceof HTMLInputElement) {
    activeElement.form?.requestSubmit()
    return
  }
  if (activeElement instanceof HTMLElement) {
    if (typeof activeElement.click === 'function') {
      activeElement.click()
      return
    }
  }
}
