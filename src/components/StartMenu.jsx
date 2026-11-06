// StartMenu.jsx — Pre-game title screen (main / instructions / options / account).

import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { CharacterPreview } from '../CharacterPreview.jsx'
import {
  getConnectedGamepads,
  getPreferredGamepad,
} from '../game/gamepadInput.js'
import { CHARACTERS, KENNEY_RUN_FBX } from '../game/characterAssets.js'
import { LEVEL2_PLAYER_CARS } from '../game/level2CarAssets.js'
import {
  getLevelConfig,
  PLAYABLE_LEVEL_NUMBERS,
} from '../game/levels.js'
import {
  FREE_CAR_IDS,
  FREE_CHARACTER_IDS,
  PAID_CAR_IDS,
  PAID_CHARACTER_IDS,
  getItemPrice,
} from '../game/store.js'
import { ScoreboardsPanel } from './ScoreboardsPanel.jsx'

const LEVEL_COVER_IMAGES = {
  1: '/level-covers/level-1.webp',
  2: '/level-covers/level-2.webp',
  4: '/level-covers/level-4.webp',
  5: '/level-covers/level-5.webp',
  6: '/level-covers/level-6.webp',
  8: '/level-covers/level-7.webp',
}

function MenuIcon({ name, className = 'start-menu__tile-icon' }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    className,
  }
  if (name === 'play') {
    return (
      <svg {...common}>
        <polygon points="8,5 19,12 8,19" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (name === 'user') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19.2c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
      </svg>
    )
  }
  if (name === 'scores') {
    return (
      <svg {...common}>
        <path d="M5 19V11h3.2v8" />
        <path d="M10.4 19V6h3.2v13" />
        <path d="M15.8 19v-5H19v5" />
      </svg>
    )
  }
  if (name === 'help') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M9.6 9.4a2.4 2.4 0 0 1 4.6.8c0 1.6-2.2 2-2.2 3.3" />
        <path d="M12 16.8h.01" />
      </svg>
    )
  }
  if (name === 'options') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
      </svg>
    )
  }
  if (name === 'store') {
    return (
      <svg {...common}>
        <path d="M6 8h12l-1 11H7L6 8z" />
        <path d="M9 8V6.8A3 3 0 0 1 12 4a3 3 0 0 1 3 2.8V8" />
      </svg>
    )
  }
  if (name === 'levels') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
      </svg>
    )
  }
  if (name === 'wallet') {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10.5h18" />
        <circle cx="16.2" cy="15" r="1.15" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M10 6.5V4.5h9v9h-2" />
      <path d="M4.5 11h8.5" />
      <path d="M10 7.5 13.5 11 10 14.5" />
      <path d="M5 8.5v9h7" />
    </svg>
  )
}

function WalletBadge({ balance, store = false }) {
  return (
    <p
      className={
        'start-menu__wallet-badge' + (store ? ' start-menu__wallet-badge--store' : '')
      }
      aria-live="polite"
    >
      <MenuIcon name="wallet" className="start-menu__wallet-icon" />
      <span>Wallet: R {balance}</span>
    </p>
  )
}

function HomeTile({ icon, label, onClick, primary = false }) {
  return (
    <button
      type="button"
      className={'start-menu__tile' + (primary ? ' start-menu__tile--primary' : '')}
      onClick={onClick}
    >
      <MenuIcon name={icon} />
      <span className="start-menu__tile-label">{label}</span>
    </button>
  )
}

export function StartMenu({
  menuScreen,
  onBeginGame,
  onSelectLevel,
  menuSelectedLevel,
  onNavigate,
  onExit,
  selectedCharacterId,
  onSelectCharacter,
  selectedLevel2CarId,
  onSelectLevel2Car,
  musicMuted,
  onToggleMusicMuted,
  autoForward = false,
  onToggleAutoForward,
  walletBalance = 0,
  unlockedIds = { characters: [], cars: [] },
  onBuyStoreItem,
}) {
  const {
    user,
    authBusy,
    authError,
    userLabel,
    clearAuthError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  } = useAuth()

  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [connectedGamepads, setConnectedGamepads] = useState([])
  const [gamepadInput, setGamepadInput] = useState({
    pressedButtons: [],
    activeAxes: [],
  })

  useEffect(() => {
    if (menuScreen !== 'options') return undefined

    const refreshGamepads = () => {
      const nextGamepads = getConnectedGamepads()
      setConnectedGamepads((current) => {
        const unchanged =
          current.length === nextGamepads.length &&
          current.every((gamepad, index) => {
            const next = nextGamepads[index]
            return (
              gamepad.index === next.index &&
              gamepad.id === next.id &&
              gamepad.mapping === next.mapping &&
              gamepad.buttons.length === next.buttons.length &&
              gamepad.axes.length === next.axes.length
            )
          })
        return unchanged ? current : nextGamepads
      })
      const gamepad = getPreferredGamepad(nextGamepads)
      const pressedButtons = gamepad
          ? Array.from(gamepad.buttons, (button, index) =>
              button.pressed || button.value > 0.5 ? index : null
            ).filter((index) => index !== null)
          : []
      const activeAxes = gamepad
          ? Array.from(gamepad.axes, (value, index) => {
              const rounded = Math.round(value * 10) / 10
              return Math.abs(rounded) > 0.2 ? `${index}:${rounded.toFixed(1)}` : null
            }).filter((value) => value !== null)
          : []
      const inputSignature = `${pressedButtons.join(',')}|${activeAxes.join(',')}`
      setGamepadInput((current) =>
          current.signature === inputSignature
            ? current
            : { pressedButtons, activeAxes, signature: inputSignature }
      )
    }
    refreshGamepads()
    const interval = window.setInterval(refreshGamepads, 100)
    window.addEventListener('gamepadconnected', refreshGamepads)
    window.addEventListener('gamepaddisconnected', refreshGamepads)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('gamepadconnected', refreshGamepads)
      window.removeEventListener('gamepaddisconnected', refreshGamepads)
    }
  }, [menuScreen])

  useEffect(() => {
    if (menuScreen === 'account') {
      clearAuthError()
    }
  }, [menuScreen, clearAuthError])

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    const ok =
      authMode === 'signup'
        ? await signUpWithEmail(email, password, displayName)
        : await signInWithEmail(email, password)
    if (ok) {
      setPassword('')
      onNavigate('main')
    }
  }

  const handleGoogle = async () => {
    const ok = await signInWithGoogle()
    if (ok) onNavigate('main')
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const characterUnlocked = (id) =>
    FREE_CHARACTER_IDS.includes(id) || unlockedIds.characters.includes(id)
  const carUnlocked = (id) =>
    FREE_CAR_IDS.includes(id) || unlockedIds.cars.includes(id)

  const buyLabel = (kind, id) => {
    const owned = kind === 'character' ? characterUnlocked(id) : carUnlocked(id)
    const price = getItemPrice(kind, id)
    if (owned) return 'Owned'
    if (walletBalance < price) return 'Not enough coins'
    return `Buy — ${price} coins`
  }

  const renderPickCard = (id, active, label, preview, onSelect, locked) => (
    <div
      key={id}
      className={
        'start-menu__char-card' +
        (active ? ' start-menu__char-card--active' : '') +
        (locked ? ' start-menu__char-card--locked' : '')
      }
      role="button"
      tabIndex={locked ? -1 : 0}
      aria-pressed={active}
      aria-disabled={locked || undefined}
      onClick={() => {
        if (locked) {
          onNavigate('store')
          return
        }
        onSelect(id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (locked) {
            onNavigate('store')
            return
          }
          onSelect(id)
        }
      }}
    >
      <div className="start-menu__char-preview">{preview}</div>
      {locked ? (
        <div className="start-menu__char-lock">Buy in Store</div>
      ) : null}
      <div className="start-menu__char-name">{label}</div>
    </div>
  )

  const renderStoreCard = (kind, def, preview) => {
    const owned =
      kind === 'character' ? characterUnlocked(def.id) : carUnlocked(def.id)
    const price = getItemPrice(kind, def.id)
    const canBuy = !owned && walletBalance >= price
    const rarity = kind === 'car' ? def.rarity : null
    return (
      <div
        key={def.id}
        className={
          'start-menu__char-card start-menu__store-card' +
          (owned ? ' start-menu__store-card--owned' : '') +
          (rarity ? ` start-menu__store-card--${rarity}` : '')
        }
      >
        <div className="start-menu__char-preview">{preview}</div>
        <div className="start-menu__char-name">{def.label}</div>
        {rarity ? <p className="start-menu__store-rarity">{rarity}</p> : null}
        <p className="start-menu__store-price">{price} coins</p>
        <button
          type="button"
          className="start-menu__pixel-btn start-menu__store-buy"
          disabled={!canBuy}
          onClick={() => onBuyStoreItem?.(kind, def.id)}
        >
          {buyLabel(kind, def.id)}
        </button>
      </div>
    )
  }
  const selectedLevelIndex = Math.max(
    0,
    PLAYABLE_LEVEL_NUMBERS.indexOf(menuSelectedLevel)
  )
  const selectedLevelNumber = PLAYABLE_LEVEL_NUMBERS[selectedLevelIndex]
  const selectedLevelDisplayNumber = selectedLevelIndex + 1
  const selectedLevelConfig = getLevelConfig(selectedLevelNumber)
  const selectedLevelCover = LEVEL_COVER_IMAGES[selectedLevelNumber]
  const primaryGamepad = getPreferredGamepad(connectedGamepads)

  return (
    <div
      className="start-menu start-menu--retro start-menu--title-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Start menu"
    >
      <div className="start-menu__body">
        {menuScreen === 'main' && (
          <>
            <header className="start-menu__brand">
              <h1
                className="start-menu__logo"
                id="game-title-heading"
                aria-label="Mzansi Escape"
              >
                <span className="start-menu__logo-line-wrap" aria-hidden="true">
                  <span className="start-menu__logo-text start-menu__logo-metallic-border">
                    MZANSI
                    <br />
                    ESCAPE
                  </span>
                  <span className="start-menu__logo-text start-menu__logo-flag-fill">
                    MZANSI
                    <br />
                    ESCAPE
                  </span>
                </span>
              </h1>
              <p className="start-menu__edition">STREETS · SOUTH AFRICA</p>
            </header>
            <nav className="start-menu__home" aria-label="Main menu">
              {user ? (
                <>
                  <p className="start-menu__signed-in" aria-live="polite">
                    Signed in as {userLabel}
                  </p>
                  <p className="start-menu__options-sub">
                    Wallet, unlocks, and records save to this account.
                  </p>
                </>
              ) : null}
              <WalletBadge balance={walletBalance} />
              <div className="start-menu__home-grid">
                <HomeTile icon="play" label="New Game" onClick={onBeginGame} primary />
                <HomeTile
                  icon="user"
                  label={user ? 'Account' : 'Sign In'}
                  onClick={() => onNavigate('account')}
                />
                <HomeTile
                  icon="scores"
                  label="Scoreboards"
                  onClick={() => onNavigate('scoreboards')}
                />
                <HomeTile
                  icon="help"
                  label="How to Play"
                  onClick={() => onNavigate('instructions')}
                />
                <HomeTile
                  icon="options"
                  label="Options"
                  onClick={() => onNavigate('options')}
                />
                <HomeTile icon="store" label="Store" onClick={() => onNavigate('store')} />
                <HomeTile
                  icon="levels"
                  label="Levels"
                  onClick={() => onNavigate('levels')}
                />
                <HomeTile icon="quit" label="Quit" onClick={onExit} />
              </div>
            </nav>
          </>
        )}
        {menuScreen === 'account' && (
          <div
            className="start-menu__sub start-menu__sub--account"
            aria-label="Account"
          >
            <h2 className="start-menu__sub-title">Account</h2>
            {user ? (
              <>
                <p className="start-menu__options-sub">
                  Signed in as <strong>{userLabel}</strong>
                  {user.email ? (
                    <>
                      <br />
                      <span className="start-menu__account-email">
                        {user.email}
                      </span>
                    </>
                  ) : null}
                  <br />
                  Wallet, unlocks, selected character/car, and records save to
                  this account.
                </p>
                <button
                  type="button"
                  className="start-menu__pixel-btn"
                  onClick={handleSignOut}
                  disabled={authBusy}
                >
                  {authBusy ? 'Please wait…' : 'Sign Out'}
                </button>
              </>
            ) : (
              <>
                <p className="start-menu__options-sub">
                  Sign in to sync your wallet, unlocks, and best scores, and to
                  appear on the global leaderboard.
                </p>
                <button
                  type="button"
                  className="start-menu__pixel-btn start-menu__pixel-btn--google"
                  onClick={handleGoogle}
                  disabled={authBusy}
                >
                  {authBusy ? 'Please wait…' : 'Continue with Google'}
                </button>
                <div className="start-menu__auth-divider" aria-hidden="true">
                  <span>or email</span>
                </div>
                <div className="start-menu__auth-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    className={
                      'start-menu__auth-tab' +
                      (authMode === 'signin' ? ' start-menu__auth-tab--active' : '')
                    }
                    aria-selected={authMode === 'signin'}
                    onClick={() => {
                      setAuthMode('signin')
                      clearAuthError()
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    className={
                      'start-menu__auth-tab' +
                      (authMode === 'signup' ? ' start-menu__auth-tab--active' : '')
                    }
                    aria-selected={authMode === 'signup'}
                    onClick={() => {
                      setAuthMode('signup')
                      clearAuthError()
                    }}
                  >
                    Sign Up
                  </button>
                </div>
                <form
                  className="start-menu__auth-form"
                  onSubmit={handleEmailSubmit}
                >
                  {authMode === 'signup' && (
                    <label className="start-menu__auth-label">
                      Display name
                      <input
                        className="start-menu__auth-input"
                        type="text"
                        name="displayName"
                        autoComplete="nickname"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={authBusy}
                      />
                    </label>
                  )}
                  <label className="start-menu__auth-label">
                    Email
                    <input
                      className="start-menu__auth-input"
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={authBusy}
                    />
                  </label>
                  <label className="start-menu__auth-label">
                    Password
                    <input
                      className="start-menu__auth-input"
                      type="password"
                      name="password"
                      autoComplete={
                        authMode === 'signup'
                          ? 'new-password'
                          : 'current-password'
                      }
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={authBusy}
                    />
                  </label>
                  <button
                    type="submit"
                    className="start-menu__pixel-btn"
                    disabled={authBusy}
                  >
                    {authBusy
                      ? 'Please wait…'
                      : authMode === 'signup'
                        ? 'Create Account'
                        : 'Sign In'}
                  </button>
                </form>
              </>
            )}
            {authError ? (
              <p className="start-menu__auth-error" role="alert">
                {authError}
              </p>
            ) : null}
            <button
              type="button"
              className="start-menu__pixel-btn"
              onClick={() => onNavigate('main')}
            >
              Back
            </button>
          </div>
        )}
        <ScoreboardsPanel menuScreen={menuScreen} onNavigate={onNavigate} />
        {menuScreen === 'instructions' && (
          <div className="start-menu__sub">
            <h2 className="start-menu__sub-title">How to play</h2>
            <div className="start-menu__sub-body">
              <p>
                Taxis spawn ahead and come at you. Move on the road, switch
                lanes, jump, or roll so they do not hit you. When a taxi passes
                behind you, your dodge count goes up.
              </p>
              <p>
                Dark patches on the road are potholes: moving through them with{' '}
                <kbd className="start-menu__kbd">W</kbd> /{' '}
                <kbd className="start-menu__kbd">S</kbd> slows you. Press{' '}
                <kbd className="start-menu__kbd">Space</kbd> to jump and pass
                over a pothole without slowing.
              </p>
              <p>
                Reach the far end of the road to finish the level. Your
                dodged-taxi count is shown when you complete it.
              </p>
              <p className="start-menu__sub-h3">Controls</p>
              <ul className="start-menu__sub-list">
                <li>
                  <kbd className="start-menu__kbd">W</kbd>{' '}
                  <kbd className="start-menu__kbd">↑</kbd> forward,{' '}
                  <kbd className="start-menu__kbd">S</kbd>{' '}
                  <kbd className="start-menu__kbd">↓</kbd> back
                </li>
                <li>
                  Options → Auto-forward: keep moving without holding W; S still
                  reverses
                </li>
                <li>
                  <kbd className="start-menu__kbd">A</kbd>{' '}
                  <kbd className="start-menu__kbd">D</kbd> or arrows: lanes
                </li>
                <li>
                  <kbd className="start-menu__kbd">Space</kbd> jump, swipe down
                  to roll (touch)
                </li>
                <li>
                  <kbd className="start-menu__kbd">R</kbd> restart after a hit
                </li>
                <li>
                  <kbd className="start-menu__kbd">P</kbd> or{' '}
                  <kbd className="start-menu__kbd">Esc</kbd>: pause menu
                  (resume, restart, or main menu)
                </li>
                <li>Touch: swipe for lanes, up / down to jump or roll</li>
              </ul>
              <p className="start-menu__hint">
                Enter or Space also starts a new game on the main menu.
              </p>
            </div>
            <button
              type="button"
              className="start-menu__pixel-btn"
              onClick={() => onNavigate('main')}
            >
              Back
            </button>
          </div>
        )}
        {menuScreen === 'levels' && (
          <div
            className="start-menu__sub start-menu__sub--levels"
            aria-label="Select level"
          >
            <h2 className="start-menu__sub-title">Levels</h2>
            <p className="start-menu__options-sub">
              Browse the seven levels. Select one, then choose New Game from the
              main menu.
            </p>
            <div
              className="start-menu__level-select"
              aria-label="Level selection"
            >
              <div className="start-menu__level-carousel">
                <button
                  type="button"
                  className="start-menu__level-arrow"
                  aria-label="Previous level"
                  disabled={selectedLevelIndex === 0}
                  onClick={() =>
                    onSelectLevel(PLAYABLE_LEVEL_NUMBERS[selectedLevelIndex - 1])
                  }
                >
                  ‹
                </button>
                <article
                  className="start-menu__level-card"
                  aria-live="polite"
                  aria-label={`Level ${selectedLevelDisplayNumber}: ${selectedLevelConfig.label}`}
                >
                  {selectedLevelCover ? (
                    <img
                      className="start-menu__level-cover"
                      src={selectedLevelCover}
                      alt={`${selectedLevelConfig.label} level artwork`}
                    />
                  ) : (
                    <div className="start-menu__level-cover-placeholder">
                      <span className="start-menu__level-cover-placeholder-city" aria-hidden="true" />
                      <span>
                        {selectedLevelConfig.id === 3
                          ? selectedLevelConfig.label
                          : 'Artwork coming soon'}
                      </span>
                    </div>
                  )}
                  <div className="start-menu__level-card-caption">
                    <span className="start-menu__level-card-number">
                      LEVEL {selectedLevelDisplayNumber}
                    </span>
                    <h3>{selectedLevelConfig.label}</h3>
                  </div>
                </article>
                <button
                  type="button"
                  className="start-menu__level-arrow"
                  aria-label="Next level"
                  disabled={
                    selectedLevelIndex === PLAYABLE_LEVEL_NUMBERS.length - 1
                  }
                  onClick={() =>
                    onSelectLevel(PLAYABLE_LEVEL_NUMBERS[selectedLevelIndex + 1])
                  }
                >
                  ›
                </button>
              </div>
              <p className="start-menu__level-position" aria-live="polite">
                {selectedLevelDisplayNumber} / {PLAYABLE_LEVEL_NUMBERS.length}
              </p>
            </div>
            <button
              type="button"
              className="start-menu__pixel-btn"
              onClick={() => onNavigate('main')}
            >
              Back
            </button>
          </div>
        )}
        {menuScreen === 'options' && (
          <div
            className="start-menu__sub start-menu__sub--options"
            role="group"
            aria-label="Game options"
          >
            <h2 className="start-menu__sub-title">Options</h2>
            <p className="start-menu__options-sub">
              Tap a card to preview your choice. Selections are saved for next
              time.
            </p>
            <section
              className="start-menu__options-section"
              aria-labelledby="options-music-heading"
            >
              <h3
                id="options-music-heading"
                className="start-menu__options-heading"
              >
                Background music
              </h3>
              <button
                type="button"
                className="start-menu__pixel-btn"
                onClick={onToggleMusicMuted}
                aria-pressed={musicMuted}
              >
                {musicMuted ? 'Music: Muted' : 'Music: On'}
              </button>
            </section>
            <section
              className="start-menu__options-section"
              aria-labelledby="options-controls-heading"
            >
              <h3
                id="options-controls-heading"
                className="start-menu__options-heading"
              >
                Movement
              </h3>
              <p className="start-menu__options-sub">
                Auto-forward keeps you moving without holding W. S / Down still
                reverses and overrides it.
              </p>
              <button
                type="button"
                className="start-menu__pixel-btn"
                onClick={onToggleAutoForward}
                aria-pressed={autoForward}
              >
                {autoForward ? 'Auto-forward: On' : 'Auto-forward: Off'}
              </button>
            </section>
            <section
              className="start-menu__options-section"
              aria-labelledby="options-gamepad-heading"
            >
              <h3
                id="options-gamepad-heading"
                className="start-menu__options-heading"
              >
                Xbox / USB Controller
              </h3>
              <p className="start-menu__options-sub">
                Plug in by USB, or pair a Bluetooth Xbox controller in Windows
                Settings. Then click the game and press any controller button;
                no setup or code edits are needed. Keyboard controls always
                remain available.
              </p>
              {connectedGamepads.length > 0 ? (
                <>
                  <p className="start-menu__options-sub">
                    Connected: {primaryGamepad?.id ?? 'Controller'} ·{' '}
                    {primaryGamepad?.mapping === 'standard'
                      ? 'ready — standard Xbox layout'
                      : `unmapped layout — trying common controls (${primaryGamepad?.buttons.length ?? 0} buttons, ${primaryGamepad?.axes.length ?? 0} axes)`}
                    {connectedGamepads.length > 1
                      ? ` · ${connectedGamepads.length - 1} other controller(s) connected`
                      : ''}
                  </p>
                  {primaryGamepad?.mapping !== 'standard' ? (
                    <p className="start-menu__options-sub">
                      This controller does not report a standard layout. The
                      game will try the common Xbox-style button and stick
                      positions; if they do not match your controller, use
                      keyboard controls.
                    </p>
                  ) : (
                    <p className="start-menu__options-sub">
                      Left stick / D-pad: move or choose · A: confirm, jump or
                      action · B: back, roll or crouch · X: interact · Y: Q
                      action · LB / RB / LT / RT: sprint · right stick: look
                      around · Menu: pause.
                    </p>
                  )}
                  <p className="start-menu__options-sub" aria-live="polite">
                    Live input — buttons:{' '}
                    {gamepadInput.pressedButtons.length > 0
                      ? gamepadInput.pressedButtons.map((index) => `#${index}`).join(', ')
                      : 'none'}
                    {' · '}axes:{' '}
                    {gamepadInput.activeAxes.length > 0
                      ? gamepadInput.activeAxes.join(', ')
                      : 'centered'}
                  </p>
                  <p className="start-menu__options-sub">
                    To move, tilt the left stick without pressing it down. The
                    clicks you reported are L3 / R3. Tilt a stick or press a
                    D-pad direction and check which live axes or buttons
                    change.
                  </p>
                </>
              ) : (
                <p className="start-menu__options-sub">
                  No controller detected yet. For wired play, connect a USB
                  cable. For wireless play, pair the controller in Windows
                  Bluetooth settings (some older Xbox controllers need the
                  Xbox Wireless Adapter). Click the game page and press a
                  controller button. If it still is not found, check that
                  Windows sees it in Set up USB game controllers, then reload
                  the game.
                </p>
              )}
            </section>
            <section
              className="start-menu__options-section"
              aria-labelledby="options-level1-heading"
            >
              <h3
                id="options-level1-heading"
                className="start-menu__options-heading"
              >
                Pick a Level 1 character
              </h3>
              <div className="start-menu__char-grid">
                {CHARACTERS.map((c) =>
                  renderPickCard(
                    c.id,
                    selectedCharacterId === c.id,
                    c.label,
                    <CharacterPreview
                      modelUrl={c.url}
                      format={c.format ?? 'gltf'}
                      skinUrl={c.skinUrl}
                      runAnimUrl={c.runAnimUrl ?? KENNEY_RUN_FBX}
                    />,
                    onSelectCharacter,
                    !characterUnlocked(c.id)
                  )
                )}
              </div>
            </section>
            <section
              className="start-menu__options-section"
              aria-labelledby="options-level2-car-heading"
            >
              <h3
                id="options-level2-car-heading"
                className="start-menu__options-heading"
              >
                Pick a car for Level 2
              </h3>
              <div className="start-menu__char-grid start-menu__char-grid--cars">
                {LEVEL2_PLAYER_CARS.map((car) =>
                  renderPickCard(
                    car.id,
                    selectedLevel2CarId === car.id,
                    car.label,
                    <img
                      className="start-menu__car-thumb"
                      src={car.imageUrl}
                      alt=""
                      draggable={false}
                    />,
                    onSelectLevel2Car,
                    !carUnlocked(car.id)
                  )
                )}
              </div>
            </section>
            <button
              type="button"
              className="start-menu__pixel-btn"
              onClick={() => onNavigate('main')}
            >
              Back
            </button>
          </div>
        )}
        {menuScreen === 'store' && (
          <div
            className="start-menu__sub start-menu__sub--options start-menu__sub--store"
            role="group"
            aria-label="Store"
          >
            <h2 className="start-menu__sub-title">Store</h2>
            <WalletBadge balance={walletBalance} store />
            <p className="start-menu__options-sub">
              Spend coins collected in any level. Unlocks stay saved on this
              device.
            </p>
            <section
              className="start-menu__options-section"
              aria-labelledby="store-characters-heading"
            >
              <h3
                id="store-characters-heading"
                className="start-menu__options-heading"
              >
                Characters
              </h3>
              <div className="start-menu__char-grid">
                {CHARACTERS.filter((c) => PAID_CHARACTER_IDS.includes(c.id)).map(
                  (c) =>
                    renderStoreCard(
                      'character',
                      c,
                      <CharacterPreview
                        modelUrl={c.url}
                        format={c.format ?? 'gltf'}
                        skinUrl={c.skinUrl}
                        runAnimUrl={c.runAnimUrl ?? KENNEY_RUN_FBX}
                      />
                    )
                )}
              </div>
            </section>
            <section
              className="start-menu__options-section"
              aria-labelledby="store-cars-heading"
            >
              <h3
                id="store-cars-heading"
                className="start-menu__options-heading"
              >
                Level 2 Cars
              </h3>
              <div className="start-menu__char-grid start-menu__char-grid--cars">
                {LEVEL2_PLAYER_CARS.filter((car) =>
                  PAID_CAR_IDS.includes(car.id)
                ).map((car) =>
                  renderStoreCard(
                    'car',
                    car,
                    <img
                      className="start-menu__car-thumb"
                      src={car.imageUrl}
                      alt=""
                      draggable={false}
                    />
                  )
                )}
              </div>
            </section>
            <button
              type="button"
              className="start-menu__pixel-btn"
              onClick={() => onNavigate('main')}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
