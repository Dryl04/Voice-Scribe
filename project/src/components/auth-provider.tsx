import { createContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AuthDialog } from '@/components/auth-dialog'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthError | null>
  signUp: (email: string, password: string) => Promise<AuthError | null>
  signOut: () => Promise<void>
  openAuthDialog: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const openAuthDialog = () => setAuthOpen(true)

  const value: AuthContextValue = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    openAuthDialog,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </AuthContext.Provider>
  )
}
