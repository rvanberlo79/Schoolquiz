import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { translations, interpolate } from '../lib/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en')
  const [loading, setLoading] = useState(true)

  const loadLanguage = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      setLanguageState('en')
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', user.id)
      .single()
    const lang = data?.language === 'nl' ? 'nl' : 'en'
    setLanguageState(lang)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadLanguage()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadLanguage()
    })
    return () => subscription.unsubscribe()
  }, [loadLanguage])

  const t = useCallback((key, vars) => {
    const dict = translations[language] || translations.en
    const str = dict[key] ?? translations.en[key] ?? key
    return interpolate(str, vars)
  }, [language])

  const setLanguage = useCallback(async (newLang) => {
    if (newLang !== 'en' && newLang !== 'nl') return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      setLanguageState(newLang)
      return
    }
    await supabase.from('profiles').update({ language: newLang }).eq('id', user.id)
    setLanguageState(newLang)
  }, [])

  const value = { language, setLanguage, t, loading }
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key, vars) => (translations.en[key] ? interpolate(translations.en[key], vars) : key),
      loading: false,
    }
  }
  return ctx
}
