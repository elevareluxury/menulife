import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const S = {
  page: {
    minHeight: '100vh',
    background: '#0F1115',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  } as React.CSSProperties,
  card: {
    background: '#171A21',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
  } as React.CSSProperties,
  logo: {
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  logoText: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#F5F7FA',
    letterSpacing: '-0.03em',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#F5F7FA',
    marginBottom: '1.75rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#98A2B3',
    marginBottom: '0.375rem',
  },
  inputWrap: {
    position: 'relative' as const,
  },
  input: {
    width: '100%',
    background: '#1E2330',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '11px 44px 11px 14px',
    color: '#F5F7FA',
    fontSize: '0.9375rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  } as React.CSSProperties,
  inputError: {
    borderColor: '#FF6B7A',
  },
  eyeBtn: {
    position: 'absolute' as const,
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#98A2B3',
    display: 'flex',
    padding: '2px',
  } as React.CSSProperties,
  fieldWrap: {
    marginBottom: '1.25rem',
  },
  errorMsg: {
    marginTop: '0.375rem',
    fontSize: '0.8125rem',
    color: '#FF6B7A',
  },
  hint: {
    marginTop: '0.375rem',
    fontSize: '0.8125rem',
    color: '#98A2B3',
  },
  btn: {
    marginTop: '0.5rem',
    width: '100%',
    background: 'linear-gradient(135deg, #FF6B7A 0%, #FF4757 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '13px',
    color: '#fff',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'opacity 0.15s',
  } as React.CSSProperties,
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
}

export function ResetPassword() {
  const navigate = useNavigate()

  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [showConf, setShowConf]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [checking, setChecking]       = useState(true)
  const [error, setError]             = useState('')

  // Verificar que haya sesión activa (proviene del link del email)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('El link expiró. Pedí uno nuevo.')
        navigate('/forgot-password', { replace: true })
      } else {
        setChecking(false)
      }
    })
  }, [navigate])

  const validate = (): string => {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (password !== confirm)  return 'Las contraseñas no coinciden.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const msg = validate()
    if (msg) { setError(msg); return }
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) throw authError
      toast.success('Contraseña actualizada')
      // Sign out then redirect — avoids session-state race when landing on dashboard
      await supabase.auth.signOut()
      navigate('/login?message=Contraseña+actualizada+correctamente', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar. Intentá de nuevo.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div style={{ ...S.page }}>
        <p style={{ color: '#98A2B3' }}>Verificando acceso...</p>
      </div>
    )
  }

  const isDisabled = loading || password.length < 8 || confirm.length === 0

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <span style={S.logoText}>menulife</span>
        </div>

        <h2 style={S.title}>Nueva contraseña</h2>

        <form onSubmit={handleSubmit} noValidate>
          {/* Nueva contraseña */}
          <div style={S.fieldWrap}>
            <label style={S.label} htmlFor="rp-password">
              Nueva contraseña
            </label>
            <div style={S.inputWrap}>
              <input
                id="rp-password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                style={{
                  ...S.input,
                  ...(error && password.length < 8 ? S.inputError : {}),
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#FF6B7A' }}
                onBlur={(e)  => {
                  e.currentTarget.style.borderColor =
                    error && password.length < 8 ? '#FF6B7A' : 'rgba(255,255,255,0.1)'
                }}
              />
              <button
                type="button"
                style={S.eyeBtn}
                onClick={() => setShowPwd(v => !v)}
                tabIndex={-1}
                aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <p style={S.hint}>Mínimo 8 caracteres</p>
          </div>

          {/* Confirmar contraseña */}
          <div style={S.fieldWrap}>
            <label style={S.label} htmlFor="rp-confirm">
              Confirmar contraseña
            </label>
            <div style={S.inputWrap}>
              <input
                id="rp-confirm"
                type={showConf ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repetí la contraseña"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError('') }}
                style={{
                  ...S.input,
                  ...(error && password !== confirm ? S.inputError : {}),
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#FF6B7A' }}
                onBlur={(e)  => {
                  e.currentTarget.style.borderColor =
                    error && password !== confirm ? '#FF6B7A' : 'rgba(255,255,255,0.1)'
                }}
              />
              <button
                type="button"
                style={S.eyeBtn}
                onClick={() => setShowConf(v => !v)}
                tabIndex={-1}
                aria-label={showConf ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConf ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && <p style={{ ...S.errorMsg, marginBottom: '0.75rem' }}>{error}</p>}

          <button
            type="submit"
            disabled={isDisabled}
            style={{
              ...S.btn,
              ...(isDisabled ? S.btnDisabled : {}),
            }}
          >
            {loading && <Spinner />}
            Guardar nueva contraseña
          </button>
        </form>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
