import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import WatchParty from './WatchParty'

const defaultProps = {
  participants: [
    { id: 'p1', email: 'alice@test.com' },
    { id: 'p2', email: 'bob@test.com' },
  ],
  connected: true,
  partyId: 'party-123',
  onJoin: vi.fn(),
  onLeave: vi.fn(),
  amHost: true,
  hostId: 'p1',
  messages: [
    { id: 'm1', sender: 'alice', text: 'hola', timestamp: 1 },
    { id: 'm2', sender: 'bob', text: 'que tal', timestamp: 2 },
  ],
  onSendMessage: vi.fn(),
  onSendReaction: vi.fn(),
  onReSync: vi.fn(),
  onRequestHost: vi.fn(),
}

describe('WatchParty', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra boton Iniciar cuando no hay conexion', () => {
    render(<WatchParty {...defaultProps} connected={false} participants={[]} />)
    expect(screen.getByText('Iniciar Watch Party')).toBeTruthy()
  })

  it('muestra contador de participantes cuando conectado', () => {
    render(<WatchParty {...defaultProps} />)
    expect(screen.getByText('2 viendo')).toBeTruthy()
  })

  it('llama onJoin al hacer click en Iniciar', () => {
    render(<WatchParty {...defaultProps} connected={false} participants={[]} />)
    fireEvent.click(screen.getByText('Iniciar Watch Party'))
    expect(defaultProps.onJoin).toHaveBeenCalledOnce()
  })

  it('abre panel al hacer click en el boton de estado', () => {
    render(<WatchParty {...defaultProps} />)
    fireEvent.click(screen.getByText('2 viendo'))
    expect(screen.getByText('Watch Party')).toBeTruthy()
  })

  it('muestra participantes en el panel', () => {
    render(<WatchParty {...defaultProps} />)
    fireEvent.click(screen.getByText('2 viendo'))
    expect(screen.getByText('alice@test.com')).toBeTruthy()
    expect(screen.getByText('bob@test.com')).toBeTruthy()
  })

  it('muestra reacciones cuando conectado', () => {
    render(<WatchParty {...defaultProps} />)
    fireEvent.click(screen.getByText('2 viendo'))
    expect(screen.getByText('😂')).toBeTruthy()
    expect(screen.getByText('🔥')).toBeTruthy()
  })

  it('llama onSendReaction al hacer click en emoji', () => {
    render(<WatchParty {...defaultProps} />)
    fireEvent.click(screen.getByText('2 viendo'))
    fireEvent.click(screen.getByText('🔥'))
    expect(defaultProps.onSendReaction).toHaveBeenCalledWith('🔥')
  })

  it('muestra boton Salir cuando conectado y host', () => {
    render(<WatchParty {...defaultProps} />)
    fireEvent.click(screen.getByText('2 viendo'))
    expect(screen.getByText('Salir')).toBeTruthy()
  })

  it('no muestra Pedir control cuando es host', () => {
    render(<WatchParty {...defaultProps} />)
    fireEvent.click(screen.getByText('2 viendo'))
    expect(screen.queryByText('Pedir control')).toBeNull()
  })

  it('muestra Pedir control cuando no es host', () => {
    render(<WatchParty {...defaultProps} amHost={false} />)
    fireEvent.click(screen.getByText('2 viendo'))
    expect(screen.getByText('Pedir control')).toBeTruthy()
  })

  it('llama onRequestHost al hacer click en Pedir control', () => {
    render(<WatchParty {...defaultProps} amHost={false} />)
    fireEvent.click(screen.getByText('2 viendo'))
    fireEvent.click(screen.getByText('Pedir control'))
    expect(defaultProps.onRequestHost).toHaveBeenCalledOnce()
  })

  it('llama onLeave al hacer click en Salir', () => {
    render(<WatchParty {...defaultProps} />)
    fireEvent.click(screen.getByText('2 viendo'))
    fireEvent.click(screen.getByText('Salir'))
    expect(defaultProps.onLeave).toHaveBeenCalledOnce()
  })
})
