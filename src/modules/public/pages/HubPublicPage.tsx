import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Restaurant } from '@/types'

const db = supabase as any

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface HubStory {
  id: string; image_url: string | null; title: string | null
  description: string | null; is_active: boolean
}
interface HubFeaturedProduct {
  id: string; name: string; description: string | null
  price: number | null; image_url: string | null; tag: string | null
  cta_text: string | null; cta_url: string | null
}
interface HubGalleryItem {
  id: string; url: string; type: 'image' | 'video'
  caption: string | null; sort_order: number
}
interface HubReview {
  id: string; author_name: string; author_initial: string | null
  profile_color: string | null; rating: number; text: string
  relative_time: string | null
}
interface HubLink {
  id: string; type: string; label: string; url: string
  icon: string | null; image_url: string | null; is_active: boolean; sort_order: number; click_count: number
}
interface SocialLinks {
  instagram?: string | null; facebook?: string | null; tiktok?: string | null
  whatsapp?: string | null; youtube?: string | null
  google_review?: string | null; google_maps?: string | null
}

/* ── Reserved slugs ─────────────────────────────────────────────────────────── */

const RESERVED_SLUGS = new Set([
  'dashboard','login','register','mozo','kitchen','delivery','r','waiter',
  'super-admin','superadmin','onboarding','solicitar-acceso','auth',
  'forgot-password','reset-password','catalogo',
])

/* ── Design tokens ──────────────────────────────────────────────────────────── */

const C = {
  bg:'#06080F', bg2:'#0A0D16',
  sur:'rgba(255,255,255,0.04)', sur2:'rgba(255,255,255,0.07)',
  bdr:'rgba(255,255,255,0.08)', bdr2:'rgba(255,255,255,0.16)',
  acc:'#F59E0B', acc2:'#FCD34D', grn:'#10B981', red:'#EF4444',
  t1:'#F8F9FA', t2:'rgba(248,249,250,0.60)',
  t3:'rgba(248,249,250,0.32)', t4:'rgba(248,249,250,0.14)',
  card:'#111318',
}

const HUB_CSS = `
  @keyframes hubMesh{0%{transform:translate(0,0) scale(1)}100%{transform:translate(20px,-25px) scale(1.1)}}
  @keyframes hubSpin{to{transform:rotate(360deg)}}
  @keyframes hubPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
  @keyframes hubPopIn{0%{transform:scale(0) rotate(-8deg);opacity:0}65%{transform:scale(1.12) rotate(2deg)}100%{transform:scale(1) rotate(0);opacity:1}}
  .hub-btn{display:flex;cursor:pointer;transition:opacity .15s,transform .15s;text-decoration:none}
  .hub-btn:active{transform:scale(.97) !important}
  .hub-tab:active{transform:scale(.9) !important}
  .hub-link-card{transition:transform .15s,border-color .15s}
  .hub-link-card:hover{transform:scale(1.01)}
`


/* ── Helpers ────────────────────────────────────────────────────────────────── */

function parseSocial(raw: unknown): SocialLinks {
  if (!raw || typeof raw !== 'object') return {}
  return raw as SocialLinks
}

function isOpen(bh: unknown): boolean {
  if (!bh || typeof bh !== 'object') return true
  const day = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]
  const slot = (bh as Record<string,any>)[day]
  if (!slot) return true
  if (slot.closed === true) return false
  if (!slot.open || !slot.close) return true
  const now = new Date()
  const cur = now.getHours()*60+now.getMinutes()
  const [oh,om] = (slot.open as string).split(':').map(Number)
  const [ch,cm] = (slot.close as string).split(':').map(Number)
  return cur>=oh*60+om && cur<ch*60+cm
}

function todayHours(bh: unknown): string {
  if (!bh || typeof bh !== 'object') return ''
  const day = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]
  const slot = (bh as Record<string,any>)[day]
  if (!slot) return ''
  if (slot.closed===true) return 'Cerrado hoy'
  if (slot.open && slot.close) return `${slot.open} – ${slot.close}`
  return ''
}

function hasScheduleData(bh: unknown): boolean {
  if (!bh || typeof bh !== 'object') return false
  return Object.values(bh as Record<string, any>).some(d => d?.open || d?.closed === true)
}

function starStr(n: number) { return '⭐'.repeat(Math.min(5,Math.max(1,Math.round(n)))) }

/* ── Analytics ──────────────────────────────────────────────────────────────── */

function trackEvent(restaurantId: string, eventType: string, linkId?: string) {
  db.from('hub_analytics').insert({
    restaurant_id: restaurantId,
    event_type: eventType,
    link_id: linkId ?? null,
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  }).then()
}

/* ── Scroll-reveal wrapper ──────────────────────────────────────────────────── */

function Reveal({children,delay=0}:{children:React.ReactNode;delay?:number}) {
  return (
    <motion.div
      initial={{opacity:0,y:20}}
      whileInView={{opacity:1,y:0}}
      viewport={{once:true,amount:0.08}}
      transition={{duration:0.6,delay,ease:[0.22,1,0.36,1]}}
    >
      {children}
    </motion.div>
  )
}

/* ── Section label ──────────────────────────────────────────────────────────── */

function SL({children}:{children:React.ReactNode}) {
  return (
    <p style={{fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:500,color:C.acc,
      textTransform:'uppercase',letterSpacing:'0.14em',marginBottom:12,margin:'0 0 12px'}}>
      {children}
    </p>
  )
}

/* ── Gallery lightbox ───────────────────────────────────────────────────────── */

function Lightbox({items,startIndex,onClose}:{items:HubGalleryItem[];startIndex:number;onClose:()=>void}) {
  const [cur,setCur] = useState(startIndex)
  const startX = useRef(0)

  useEffect(()=>{
    const handler = (e:KeyboardEvent)=>{
      if (e.key==='Escape') onClose()
      if (e.key==='ArrowLeft') setCur(c=>(c-1+items.length)%items.length)
      if (e.key==='ArrowRight') setCur(c=>(c+1)%items.length)
    }
    window.addEventListener('keydown',handler)
    return ()=>window.removeEventListener('keydown',handler)
  },[items.length,onClose])

  const item = items[cur]
  return (
    <motion.div
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,0.95)',
        display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}
      onClick={onClose}
      onTouchStart={e=>{ startX.current=e.touches[0].clientX }}
      onTouchEnd={e=>{
        const dx=e.changedTouches[0].clientX-startX.current
        if (dx>50) setCur(c=>(c-1+items.length)%items.length)
        else if (dx<-50) setCur(c=>(c+1)%items.length)
      }}
    >
      <button onClick={e=>{e.stopPropagation();onClose()}}
        style={{position:'absolute',top:20,right:20,width:44,height:44,borderRadius:'50%',
          background:'rgba(255,255,255,.1)',color:'#fff',border:'none',fontSize:22,
          cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1}}>
        ×
      </button>
      <motion.div key={cur} initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}}
        exit={{opacity:0,scale:.95}} transition={{duration:.2}} onClick={e=>e.stopPropagation()}
        style={{maxWidth:'90vw',maxHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {item.type==='video'
          ? <video src={item.url} controls style={{maxWidth:'100%',maxHeight:'80vh',borderRadius:12}}/>
          : <img src={item.url} alt={item.caption||''} style={{maxWidth:'100%',maxHeight:'80vh',borderRadius:12,objectFit:'contain'}}/>
        }
      </motion.div>
      {items.length>1 && <>
        <button onClick={e=>{e.stopPropagation();setCur(c=>(c-1+items.length)%items.length)}}
          style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',width:44,height:44,borderRadius:'50%',
            background:'rgba(255,255,255,.1)',color:'#fff',border:'none',fontSize:28,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
        <button onClick={e=>{e.stopPropagation();setCur(c=>(c+1)%items.length)}}
          style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',width:44,height:44,borderRadius:'50%',
            background:'rgba(255,255,255,.1)',color:'#fff',border:'none',fontSize:28,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
      </>}
      <p style={{position:'absolute',bottom:16,fontFamily:"'DM Mono',monospace",fontSize:12,color:'rgba(255,255,255,.4)'}}>
        {cur+1} / {items.length}
      </p>
    </motion.div>
  )
}

/* ── Bottom navigation ──────────────────────────────────────────────────────── */

const NAV_IDS = ['inicio','menu-ctas','novedades','locales','contacto'] as const
type NavId = typeof NAV_IDS[number]

function NavIcon({id,active}:{id:string;active:boolean}) {
  const color = active ? C.acc : C.t3
  const s = {width:20,height:20,display:'block'} as React.CSSProperties
  if (id==='inicio') return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
  if (id==='menu-ctas') return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v5a3 3 0 006 0V3"/>
      <line x1="11" y1="8" x2="11" y2="21"/>
      <line x1="17" y1="3" x2="17" y2="21"/>
    </svg>
  )
  if (id==='locales') return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.69 2 6 4.69 6 8c0 4.5 6 14 6 14s6-9.5 6-14c0-3.31-2.69-6-6-6z"/>
      <circle cx="12" cy="8" r="2.5"/>
    </svg>
  )
  if (id==='novedades') return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
  return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/>
    </svg>
  )
}

function BottomNav({isRetail}:{isRetail:boolean}) {
  const [active,setActive] = useState<NavId>('inicio')

  useEffect(()=>{
    const obs: IntersectionObserver[] = []
    NAV_IDS.forEach(id=>{
      const el = document.getElementById(id)
      if (!el) return
      const o = new IntersectionObserver(
        ([e])=>{ if (e.isIntersecting) setActive(id) },
        {threshold:0.25,rootMargin:'-20% 0px -60% 0px'}
      )
      o.observe(el)
      obs.push(o)
    })
    return ()=>obs.forEach(o=>o.disconnect())
  },[])

  const scroll = (id:string) => document.getElementById(id)?.scrollIntoView({behavior:'smooth'})

  const tabs = [
    {id:'inicio'    as NavId, label:'Inicio',                   action:()=>scroll('inicio')},
    {id:'menu-ctas' as NavId, label:isRetail?'Catálogo':'Menú', action:()=>scroll('menu-ctas')},
    {id:'locales'   as NavId, label:'Locales',                  action:()=>scroll('locales')},
    {id:'novedades' as NavId, label:'Novedades',                action:()=>scroll('novedades')},
    {id:'contacto'  as NavId, label:'Contacto',                 action:()=>scroll('contacto')},
  ]

  return (
    <div style={{
      position:'fixed',
      bottom:16,
      left:'50%',
      transform:'translateX(-50%)',
      width:'calc(100% - 32px)',
      maxWidth:398,
      height:64,
      display:'flex',
      alignItems:'center',
      justifyContent:'space-around',
      background:'rgba(255,255,255,0.05)',
      backdropFilter:'blur(20px)',
      WebkitBackdropFilter:'blur(20px)',
      border:'1px solid rgba(255,255,255,0.08)',
      borderRadius:20,
      padding:'0 8px',
      boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
      zIndex:1000,
    }}>
      {tabs.map(tab=>(
        <button key={tab.id} className="hub-tab" onClick={tab.action} style={{
          display:'flex',flexDirection:'column',alignItems:'center',
          gap:2,padding:'8px 12px',border:'none',background:'none',cursor:'pointer',
          flexShrink:0,width:'20%',
        }}>
          <NavIcon id={tab.id} active={active===tab.id} />
          <span style={{
            fontSize:10,fontFamily:"'DM Sans',sans-serif",fontWeight:500,
            color:active===tab.id?C.acc:'rgba(255,255,255,0.4)',
            transition:'color .15s',whiteSpace:'nowrap',
          }}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ── Horarios compactos con tooltip ────────────────────────────────────────── */

const DAYS_COMPACT = [
  {key:'monday',    initial:'L', label:'Lunes'},
  {key:'tuesday',   initial:'M', label:'Martes'},
  {key:'wednesday', initial:'X', label:'Miércoles'},
  {key:'thursday',  initial:'J', label:'Jueves'},
  {key:'friday',    initial:'V', label:'Viernes'},
  {key:'saturday',  initial:'S', label:'Sábado'},
  {key:'sunday',    initial:'D', label:'Domingo'},
]

function HorariosCompact({schedule}:{schedule:Record<string,any>|null}) {
  const todayKey = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]
  const [activeDay,setActiveDay] = useState<string|null>(null)
  const [tooltipPos,setTooltipPos] = useState({x:0,y:0})

  const handleDayPress = (e:React.TouchEvent|React.MouseEvent, key:string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setTooltipPos({x:rect.left+rect.width/2, y:rect.top-8})
    setActiveDay(activeDay===key ? null : key)
  }

  useEffect(()=>{
    const close = ()=>setActiveDay(null)
    document.addEventListener('touchstart',close)
    return ()=>document.removeEventListener('touchstart',close)
  },[])

  if (!schedule) return null

  return (
    <div style={{padding:'16px',position:'relative'}}>
      <p style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,
        color:'rgba(255,255,255,0.5)',textTransform:'uppercase',
        letterSpacing:'0.08em',marginBottom:12}}>
        Horarios
      </p>
      <div style={{display:'flex',justifyContent:'space-between',gap:4}}>
        {DAYS_COMPACT.map(day=>{
          const slot = schedule?.[day.key]
          const isToday = day.key===todayKey
          const isClosed = !slot||slot.closed===true
          const isActive = activeDay===day.key
          return (
            <button
              key={day.key}
              onTouchStart={(e)=>{e.stopPropagation();handleDayPress(e,day.key)}}
              onClick={(e)=>{e.stopPropagation();handleDayPress(e,day.key)}}
              style={{
                width:36,height:36,borderRadius:'50%',
                border:isToday?`1.5px solid ${C.acc}`:'1px solid rgba(255,255,255,0.1)',
                background:isActive?'rgba(245,158,11,0.15)':isToday?'rgba(245,158,11,0.08)':'rgba(255,255,255,0.04)',
                color:isClosed?'rgba(255,255,255,0.2)':isToday?C.acc:'rgba(255,255,255,0.7)',
                fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:500,
                cursor:'pointer',flexShrink:0,position:'relative',
                display:'flex',alignItems:'center',justifyContent:'center',
              }}
            >
              {day.initial}
              {!isClosed && (
                <span style={{
                  position:'absolute',bottom:2,left:'50%',
                  transform:'translateX(-50%)',
                  width:3,height:3,borderRadius:'50%',
                  background:isToday?C.acc:'rgba(255,255,255,0.4)',
                }}/>
              )}
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {activeDay && (()=>{
          const day = DAYS_COMPACT.find(d=>d.key===activeDay)!
          const slot = schedule?.[activeDay]
          const isClosed = !slot||slot.closed===true
          return (
            <motion.div
              key={activeDay}
              initial={{opacity:0,y:4,scale:0.95}}
              animate={{opacity:1,y:0,scale:1}}
              exit={{opacity:0,y:4,scale:0.95}}
              transition={{duration:0.15}}
              style={{
                position:'fixed',
                left:tooltipPos.x,top:tooltipPos.y,
                transform:'translate(-50%,-100%)',
                zIndex:1001,
                background:'rgba(20,22,30,0.95)',
                backdropFilter:'blur(12px)',
                border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:12,
                padding:'10px 16px',
                pointerEvents:'none',
                minWidth:140,
                textAlign:'center',
                boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{
                position:'absolute',bottom:-5,left:'50%',
                transform:'translateX(-50%) rotate(45deg)',
                width:10,height:10,
                background:'rgba(20,22,30,0.95)',
                border:'1px solid rgba(255,255,255,0.1)',
                borderTop:'none',borderLeft:'none',
              }}/>
              <p style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:'#fff',marginBottom:4}}>
                {day.label}
              </p>
              {isClosed ? (
                <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:C.red,margin:0}}>Cerrado</p>
              ) : (
                <p style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.acc,margin:0}}>
                  {slot.open} — {slot.close}
                </p>
              )}
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

/* ── Loading / 404 ──────────────────────────────────────────────────────────── */

function HubLoading() {
  return (
    <div style={{minHeight:'100svh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:36,height:36,borderRadius:'50%',border:`2px solid ${C.acc}`,
        borderTopColor:'transparent',animation:'hubSpin 0.8s linear infinite'}}/>
    </div>
  )
}

function HubNotFound() {
  return (
    <div style={{minHeight:'100svh',background:C.bg,display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',padding:'0 24px',textAlign:'center',
      fontFamily:"'DM Sans',sans-serif"}}>
      <p style={{fontFamily:"'Syne',sans-serif",fontSize:64,fontWeight:800,color:C.t3,marginBottom:8}}>404</p>
      <p style={{color:C.t2,marginBottom:24}}>Este Hub no fue encontrado.</p>
      <a href="/" style={{background:C.acc,color:'#000',padding:'10px 24px',borderRadius:100,
        fontWeight:600,fontSize:14,fontFamily:"'DM Sans',sans-serif",textDecoration:'none'}}>
        Volver al inicio
      </a>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export function HubPublicPage() {
  const { slug } = useParams<{slug:string}>()
  const navigate = useNavigate()

  const [restaurant, setRestaurant]           = useState<Restaurant|null>(null)
  const [story, setStory]                     = useState<HubStory|null>(null)
  const [gallery, setGallery]                 = useState<HubGalleryItem[]>([])
  const [featuredProduct, setFeaturedProduct] = useState<HubFeaturedProduct|null>(null)
  const [reviews, setReviews]                 = useState<HubReview[]>([])
  const [links, setLinks]                     = useState<HubLink[]>([])
  const [loading, setLoading]                 = useState(true)
  const [notFound, setNotFound]               = useState(false)
  const [lightboxIndex, setLightboxIndex]     = useState<number|null>(null)
  const [scrollY, setScrollY]                 = useState(0)
  const [headerVisible, setHeaderVisible]     = useState(false)

  // Scroll tracking for parallax + floating header
  useEffect(()=>{
    const onScroll = ()=>{
      const y = window.scrollY
      setScrollY(y)
      setHeaderVisible(y>80)
    }
    window.addEventListener('scroll', onScroll, {passive:true})
    return ()=>window.removeEventListener('scroll', onScroll)
  },[])

  // Inject keyframe CSS once
  useEffect(()=>{
    const id='hub-public-css'
    if (document.getElementById(id)) return
    const s=document.createElement('style'); s.id=id; s.textContent=HUB_CSS
    document.head.appendChild(s)
  },[])

  useEffect(()=>{
    if (!slug) { setNotFound(true); setLoading(false); return }
    const first=slug.split('/')[0].toLowerCase()
    if (RESERVED_SLUGS.has(first)) { navigate('/',{replace:true}); return }

    async function load() {
      try {
        const {data:rest,error} = await supabase.from('restaurants').select('*').eq('slug',slug!).eq('is_active',true).single()
        if (error||!rest) { setNotFound(true); return }
        setRestaurant(rest as Restaurant)
        const id=(rest as Restaurant).id

        const [storyRes,gallRes,fpRes,revRes,linksRes] = await Promise.all([
          db.from('hub_stories').select('*').eq('restaurant_id',id).eq('is_active',true).limit(1).maybeSingle(),
          db.from('hub_gallery').select('*').eq('restaurant_id',id).eq('is_active',true).order('sort_order').limit(12),
          db.from('hub_featured_product').select('*').eq('restaurant_id',id).eq('is_active',true).limit(1).maybeSingle(),
          db.from('hub_reviews').select('*').eq('restaurant_id',id).order('sort_order').limit(5),
          db.from('hub_links').select('*').eq('restaurant_id',id).eq('is_active',true).order('sort_order'),
        ])

        setStory(storyRes.data??null)
        setGallery(gallRes.data??[])
        setFeaturedProduct(fpRes.data??null)
        setReviews(revRes.data??[])
        setLinks(linksRes.data??[])
      } catch(e) {
        console.error(e); setNotFound(true)
      } finally { setLoading(false) }
    }
    load()
  },[slug,navigate])

  // Track profile view once restaurant loads
  useEffect(()=>{
    if (restaurant?.id) trackEvent(restaurant.id, 'profile_view')
  },[restaurant?.id])

  if (loading) return <HubLoading/>
  if (notFound||!restaurant) return <HubNotFound/>

  // ── Derived values
  const r  = restaurant
  const ra = r as any
  const social            = parseSocial(r.social_links)
  const waPhone           = social.whatsapp||r.phone||''
  const cleanWa           = waPhone.replace(/\D/g,'')
  const isRetail          = r.business_type==='retail'
  const open              = isOpen(ra.business_hours??r.schedule)
  const hoursText         = todayHours(ra.business_hours??r.schedule)
  const schedule          = ra.business_hours??r.schedule
  const categoryTags: string[] = ra.hub_category_tags??[]
  const hubCategory: string    = ra.hub_category??''
  const hubAbout: string       = ra.hub_about??''
  const hubCoverUrl: string    = ra.hub_cover_url??''
  const hubMainCtaText: string = ra.hub_main_cta_text??''
  const hubMainCtaUrl: string  = ra.hub_main_cta_url??''
  const googleRating: number|null   = ra.google_rating??null
  const googleReviewCount: number|null = ra.google_review_count??null
  const googleReviewUrl: string  = ra.google_review_url??''
  const address = [r.address,r.city].filter(Boolean).join(', ')
  const menuHref = isRetail ? `/catalogo/${slug}` : `/r/${slug}`

  // ── CTA buttons
  type CTABtn={icon:string;label:string;href?:string;scroll?:string;primary?:boolean;trackEvent?:string}
  const ctaBtns: CTABtn[] = []
  const primaryLabel = hubMainCtaText || (isRetail ? 'Ver catálogo' : 'Ver menú')
  const primaryHref  = hubMainCtaUrl  || menuHref
  const primaryIcon  = isRetail ? '🛍' : '🍽'
  ctaBtns.push({ icon: primaryIcon, label: primaryLabel, href: primaryHref, primary: true, trackEvent: 'cta_click' })
  if (isRetail) {
    if (cleanWa) ctaBtns.push({ icon:'💬', label:'WhatsApp', href:`https://wa.me/${cleanWa}`, trackEvent: 'whatsapp_click' })
    ctaBtns.push({ icon:'📍', label:'Cómo llegar', scroll:'locales', trackEvent: 'maps_click' })
    if (r.phone) ctaBtns.push({ icon:'📞', label:'Llamar', href:`tel:${r.phone}` })
  } else {
    if (r.reservations_enabled) ctaBtns.push({ icon:'📅', label:'Reservar', href:`/r/${slug}/reservar` })
    if (cleanWa) ctaBtns.push({ icon:'💬', label:'WhatsApp', href:`https://wa.me/${cleanWa}`, trackEvent: 'whatsapp_click' })
    ctaBtns.push({ icon:'📍', label:'Cómo llegar', scroll:'locales', trackEvent: 'maps_click' })
  }

  // ── Smart link click handler
  async function handleLinkClick(link: HubLink) {
    trackEvent(r.id, 'link_click', link.id)
    db.from('hub_links').update({ click_count: (link.click_count || 0) + 1 }).eq('id', link.id).then()
    window.open(link.url, '_blank', 'noopener,noreferrer')
  }

  // ── Social entries
  type SocialEntry={key:string;label:string;icon:string;url:string;color:string;bg:string}
  const socialEntries: SocialEntry[] = []
  if (social.instagram) socialEntries.push({key:'ig',label:'Instagram',icon:'📸',url:`https://instagram.com/${social.instagram}`,color:'#E1306C',bg:'rgba(225,48,108,.06)'})
  if (social.tiktok)    socialEntries.push({key:'tt',label:'TikTok',icon:'🎵',url:`https://tiktok.com/@${social.tiktok}`,color:'rgba(255,255,255,.9)',bg:'rgba(255,255,255,.04)'})
  if (social.youtube)   socialEntries.push({key:'yt',label:'YouTube',icon:'▶',url:String(social.youtube),color:'#FF4444',bg:'rgba(255,0,0,.06)'})
  if (social.facebook)  socialEntries.push({key:'fb',label:'Facebook',icon:'f',url:`https://facebook.com/${social.facebook}`,color:'#3B82F6',bg:'rgba(59,130,246,.06)'})
  if (cleanWa)          socialEntries.push({key:'wa',label:'WhatsApp',icon:'💬',url:`https://wa.me/${cleanWa}`,color:'#25D366',bg:'rgba(37,211,102,.06)'})

  // ── Contact items
  type ContactItem={icon:string;label:string;value:string;href:string;iconBg:string}
  const contactItems: ContactItem[] = []
  if (cleanWa) contactItems.push({icon:'💬',label:'WhatsApp',value:waPhone,href:`https://wa.me/${cleanWa}`,iconBg:'rgba(37,211,102,.15)'})
  if (r.phone&&!social.whatsapp) contactItems.push({icon:'📞',label:'Teléfono',value:r.phone,href:`tel:${r.phone}`,iconBg:'rgba(59,130,246,.15)'})
  if (r.email) contactItems.push({icon:'✉',label:'Email',value:r.email,href:`mailto:${r.email}`,iconBg:'rgba(245,158,11,.15)'})

  const cardBase: React.CSSProperties = {
    background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:16,
    backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
  }

  // Parallax calculations
  const coverOpacity = Math.max(0, 1 - scrollY / 300)
  const coverScale   = 1 + scrollY * 0.0003

  return (
    <>
      {/* Grain overlay */}
      <div style={{
        position:'fixed',inset:0,zIndex:999,pointerEvents:'none',opacity:0.035,
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}/>

      {/* Fixed cover image with parallax */}
      {hubCoverUrl && (
        <div style={{
          position:'fixed',top:0,left:'50%',transform:'translateX(-50%)',
          width:'100%',maxWidth:430,height:'100vh',
          zIndex:0,opacity:coverOpacity,pointerEvents:'none',
          transition:'none',overflow:'hidden',
        }}>
          <div style={{
            width:'100%',height:'100%',
            transform:`scale(${coverScale})`,transformOrigin:'center center',
            backgroundImage:`url(${hubCoverUrl})`,
            backgroundSize:'cover',backgroundPosition:'center',
          }}>
            <div style={{position:'absolute',inset:0,
              background:'linear-gradient(to bottom,rgba(6,8,15,0.3) 0%,rgba(6,8,15,0.7) 60%,rgba(6,8,15,1) 100%)'}}/>
          </div>
        </div>
      )}

      {/* Floating header — appears after 80px scroll */}
      <div style={{
        position:'fixed',top:0,left:'50%',
        transform:headerVisible?'translateX(-50%) translateY(0)':'translateX(-50%) translateY(-10px)',
        width:'100%',maxWidth:430,zIndex:40,height:60,
        display:'flex',alignItems:'center',padding:'0 16px',gap:12,
        background:headerVisible?'rgba(6,8,15,0.85)':'transparent',
        backdropFilter:headerVisible?'blur(20px)':'none',
        WebkitBackdropFilter:headerVisible?'blur(20px)':'none',
        borderBottom:headerVisible?'1px solid rgba(255,255,255,0.06)':'none',
        opacity:headerVisible?1:0,
        transition:'all 0.3s ease',
        pointerEvents:headerVisible?'auto':'none',
      }}>
        {r.logo_url && (
          <img src={r.logo_url} alt={r.name} style={{
            width:32,height:32,borderRadius:'50%',objectFit:'cover',
            border:`1px solid rgba(245,158,11,0.4)`,flexShrink:0,
          }}/>
        )}
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:'#fff',flex:1,
          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {r.name}
        </span>
        <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:100,flexShrink:0,
          background:open?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)',
          border:`1px solid ${open?'rgba(16,185,129,.25)':'rgba(239,68,68,.25)'}`}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:open?C.grn:C.red,display:'inline-block'}}/>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:500,color:open?C.grn:C.red}}>
            {open?'Abierto':'Cerrado'}
          </span>
        </div>
      </div>

      <div style={{
        fontFamily:"'DM Sans',sans-serif",
        maxWidth:430, margin:'0 auto', minHeight:'100svh', position:'relative',
      }}>

        {/* ══════════════════════════════════════════════════════
            1. HERO
        ══════════════════════════════════════════════════════ */}
        <section id="inicio" style={{
          minHeight:'100svh',position:'relative',zIndex:1,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          paddingTop:60,paddingBottom:40,
        }}>

          {/* Animated mesh blobs — shown when no cover or as overlay */}
          <div style={{position:'absolute',inset:0,zIndex:0,pointerEvents:'none',
            opacity:hubCoverUrl?0.4:1}}>
            <div style={{position:'absolute',width:420,height:420,top:-80,left:-100,borderRadius:'50%',
              background:'radial-gradient(circle,rgba(245,158,11,.18) 0%,transparent 68%)',
              animation:'hubMesh 12s ease-in-out infinite alternate'}}/>
            <div style={{position:'absolute',width:360,height:360,top:80,right:-100,borderRadius:'50%',
              background:'radial-gradient(circle,rgba(139,92,246,.12) 0%,transparent 68%)',
              animation:'hubMesh 15s ease-in-out infinite alternate-reverse'}}/>
            <div style={{position:'absolute',width:300,height:300,bottom:80,left:10,borderRadius:'50%',
              background:'radial-gradient(circle,rgba(20,184,166,.10) 0%,transparent 68%)',
              animation:'hubMesh 10s ease-in-out infinite alternate'}}/>
          </div>

          {/* Scan lines */}
          <div style={{position:'absolute',inset:0,zIndex:1,pointerEvents:'none',
            backgroundImage:'repeating-linear-gradient(0deg,rgba(255,255,255,.012) 0px,rgba(255,255,255,.012) 1px,transparent 1px,transparent 4px)',
            backgroundSize:'100% 4px'}}/>

          {/* Hero content */}
          <div style={{position:'relative',zIndex:2,display:'flex',flexDirection:'column',
            alignItems:'center',textAlign:'center',padding:'0 24px',gap:12}}>

            {/* Logo */}
            <motion.div initial={{opacity:0,scale:.8}} animate={{opacity:1,scale:1}}
              transition={{duration:.8,ease:[.34,1.56,.64,1]}} style={{position:'relative',marginBottom:4}}>
              <div style={{position:'absolute',inset:-4,borderRadius:'50%',
                background:'conic-gradient(from 0deg,transparent 0%,rgba(245,158,11,.8) 25%,transparent 50%,rgba(245,158,11,.35) 75%,transparent 100%)',
                animation:'hubSpin 8s linear infinite',zIndex:0}}/>
              <div style={{position:'relative',zIndex:1,width:92,height:92,borderRadius:'50%',
                background:'linear-gradient(135deg,#1A1F2E,#0F1219)',border:`2px solid ${C.bdr2}`,
                display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',
                boxShadow:'0 0 40px rgba(245,158,11,.18)'}}>
                {r.logo_url
                  ? <img src={r.logo_url} alt={r.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <span style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:800,color:C.acc}}>{r.name[0]?.toUpperCase()}</span>
                }
              </div>
            </motion.div>

            {/* Open/closed pill */}
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.3,duration:.5}}
              style={{display:'inline-flex',alignItems:'center',gap:7,padding:'5px 14px',borderRadius:100,
                background:open?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)',
                border:`1px solid ${open?'rgba(16,185,129,.25)':'rgba(239,68,68,.25)'}`}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:open?C.grn:C.red,
                animation:'hubPulse 1.5s ease-in-out infinite',display:'inline-block'}}/>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:500,color:open?C.grn:C.red}}>
                {open?'Abierto ahora':'Cerrado'}
              </span>
            </motion.div>

            {/* Business name */}
            <motion.h1 initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
              transition={{delay:.42,duration:.7,ease:[.22,1,.36,1]}}
              style={{fontFamily:"'Syne',sans-serif",fontSize:34,fontWeight:800,
                letterSpacing:-1,color:C.t1,margin:0,lineHeight:1.1}}>
              {r.name}
            </motion.h1>

            {/* Category tags / hub_category */}
            {(categoryTags.length>0||hubCategory) && (
              <motion.p initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.55,duration:.6}}
                style={{fontFamily:"'DM Mono',monospace",fontSize:12.5,color:C.t3,margin:0}}>
                {categoryTags.length>0 ? categoryTags.join(' · ') : hubCategory}
              </motion.p>
            )}

            {/* Meta: city + rating */}
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.65,duration:.6}}
              style={{display:'flex',alignItems:'center',gap:10,fontSize:13,color:C.t3,flexWrap:'wrap',justifyContent:'center'}}>
              {r.city && <span>📍 {r.city}</span>}
              {googleRating && <><span style={{color:C.t4}}>·</span><span>⭐ {googleRating}</span></>}
            </motion.div>
          </div>

          {/* Scroll hint arrow */}
          <motion.div
            animate={{y:[0,8,0]}}
            transition={{repeat:Infinity,duration:2,ease:'easeInOut'}}
            style={{position:'absolute',bottom:32,color:'rgba(255,255,255,0.3)',fontSize:20,zIndex:2}}
          >
            ↓
          </motion.div>
        </section>

        {/* ── Solid background content wrapper ── */}
        <div style={{
          position:'relative',zIndex:1,
          background:C.bg,
          borderRadius:'24px 24px 0 0',
          marginTop:'-24px',
          paddingTop:24,
          paddingBottom:100,
        }}>


        {/* ══════════════════════════════════════════════════════
            2. CTA BUTTONS
        ══════════════════════════════════════════════════════ */}
        <section id="menu-ctas" style={{padding:'24px 20px 0'}}>
          <Reveal>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {ctaBtns.slice(0,4).map((btn,i)=>{
                const isPrimary=!!btn.primary
                const btnStyle: React.CSSProperties = {
                  background:isPrimary
                    ?'linear-gradient(135deg,rgba(245,158,11,.15),rgba(245,158,11,.06))'
                    :C.sur,
                  border:`1px solid ${isPrimary?'rgba(245,158,11,.25)':C.bdr}`,
                  borderRadius:16,padding:'18px 14px',
                  flexDirection:'column',alignItems:'center',justifyContent:'center',
                  backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',
                }
                const inner = (
                  <>
                    <div style={{width:48,height:48,borderRadius:14,marginBottom:10,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
                      background:isPrimary?'rgba(245,158,11,.15)':'rgba(255,255,255,0.07)',
                      boxShadow:isPrimary?'0 0 20px rgba(245,158,11,.12)':'none'}}>
                      {btn.icon}
                    </div>
                    <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:13.5,fontWeight:500,
                      color:isPrimary?C.acc2:C.t1,textAlign:'center',lineHeight:1.2}}>
                      {btn.label}
                    </span>
                  </>
                )
                const handleClick = () => {
                  if (btn.trackEvent) trackEvent(r.id, btn.trackEvent)
                }
                if (btn.scroll) return (
                  <button key={i} className="hub-btn"
                    onClick={()=>{ handleClick(); document.getElementById(btn.scroll!)?.scrollIntoView({behavior:'smooth'}) }}
                    style={btnStyle as any}>
                    {inner}
                  </button>
                )
                return (
                  <a key={i} className="hub-btn" href={btn.href!}
                    target={btn.href?.startsWith('http')?'_blank':undefined}
                    rel="noopener noreferrer"
                    onClick={handleClick}
                    style={btnStyle}>
                    {inner}
                  </a>
                )
              })}
            </div>
          </Reveal>
        </section>


        {/* ══════════════════════════════════════════════════════
            3. SOBRE NOSOTROS
        ══════════════════════════════════════════════════════ */}
        {hubAbout && (
          <section style={{padding:'32px 20px 0'}}>
            <Reveal>
              <SL>Quiénes somos</SL>
              <p style={{fontSize:14,color:C.t2,lineHeight:1.7,margin:0}}>{hubAbout.slice(0,500)}</p>
            </Reveal>
          </section>
        )}


        {/* ══════════════════════════════════════════════════════
            4. SMART LINKS
        ══════════════════════════════════════════════════════ */}
        {links.length>0 && (
          <section style={{padding:'32px 20px 0'}}>
            <Reveal>
              <SL>Links</SL>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {links.map((link,i)=>(
                  <motion.button
                    key={link.id}
                    className="hub-link-card"
                    initial={{opacity:0,y:16}}
                    animate={{opacity:1,y:0}}
                    transition={{duration:0.5,delay:i*0.07,ease:[0.22,1,0.36,1]}}
                    onClick={()=>handleLinkClick(link)}
                    style={{
                      width:'100%',display:'flex',alignItems:'center',gap:14,
                      padding:'14px 18px',borderRadius:16,cursor:'pointer',
                      background:C.card,border:`1px solid rgba(255,255,255,0.08)`,
                      textAlign:'left',
                    }}
                  >
                    {link.image_url ? (
                      <div style={{width:42,height:42,borderRadius:'50%',overflow:'hidden',
                        flexShrink:0,border:`1px solid ${C.bdr}`}}>
                        <img src={link.image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      </div>
                    ) : (
                      <span style={{fontSize:22,flexShrink:0,lineHeight:1}}>{link.icon??'🔗'}</span>
                    )}
                    <span style={{
                      fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:700,
                      color:C.t1,flex:1,textAlign:'left',
                    }}>
                      {link.label}
                    </span>
                    <span style={{color:C.t3,fontSize:18,lineHeight:1,flexShrink:0}}>›</span>
                  </motion.button>
                ))}
              </div>
            </Reveal>
          </section>
        )}


        {/* ══════════════════════════════════════════════════════
            5. NOVEDAD / STORY
        ══════════════════════════════════════════════════════ */}
        {story && (
          <section id="novedades" style={{padding:'28px 20px 0'}}>
            <Reveal>
              <div style={{borderRadius:20,overflow:'hidden',position:'relative',
                background:story.image_url?'transparent':'linear-gradient(135deg,#1A2040,#0F1525)',
                border:`1px solid ${C.bdr2}`,minHeight:200}}>
                {story.image_url && (
                  <img src={story.image_url} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>
                )}
                <div style={{position:'absolute',inset:0,background:story.image_url
                  ?'linear-gradient(to bottom,rgba(0,0,0,.08) 0%,rgba(0,0,0,.68) 100%)'
                  :'linear-gradient(135deg,rgba(245,158,11,.08),rgba(139,92,246,.06))'}}/>
                {!story.image_url && <>
                  <div style={{position:'absolute',width:200,height:200,top:-50,right:-50,borderRadius:'50%',
                    background:'radial-gradient(circle,rgba(245,158,11,.15) 0%,transparent 70%)'}}/>
                  <div style={{position:'absolute',width:160,height:160,bottom:-40,left:-40,borderRadius:'50%',
                    background:'radial-gradient(circle,rgba(139,92,246,.12) 0%,transparent 70%)'}}/>
                </>}
                <div style={{position:'absolute',top:14,left:14,background:C.acc,color:'#000',
                  fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:600,padding:'4px 10px',
                  borderRadius:100,textTransform:'uppercase',letterSpacing:'0.08em',
                  animation:'hubPopIn .4s cubic-bezier(.34,1.56,.64,1) .8s both'}}>
                  ★ Nuevo
                </div>
                <div style={{position:'relative',padding:'52px 18px 20px'}}>
                  {story.title && (
                    <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:700,color:C.t1,margin:'0 0 8px'}}>
                      {story.title}
                    </h3>
                  )}
                  {story.description && (
                    <p style={{fontSize:13.5,color:C.t2,margin:'0 0 16px',lineHeight:1.6}}>{story.description}</p>
                  )}
                  <a href={menuHref} className="hub-btn" style={{display:'inline-flex',alignItems:'center',
                    background:C.acc,color:'#000',fontSize:13,fontWeight:600,
                    padding:'10px 20px',borderRadius:100,textDecoration:'none'}}>
                    {isRetail?'Ver catálogo →':'Ver menú →'}
                  </a>
                </div>
              </div>
            </Reveal>
          </section>
        )}


        {/* ══════════════════════════════════════════════════════
            6. FEATURED PRODUCT
        ══════════════════════════════════════════════════════ */}
        {featuredProduct && (
          <section style={{padding:'32px 20px 0'}}>
            <Reveal>
              <SL>{isRetail?'Destacado':'Más pedido'}</SL>
              <div style={{...cardBase,display:'flex',overflow:'hidden'}}>
                <div style={{width:110,flexShrink:0,position:'relative',overflow:'hidden',minHeight:110,
                  background:featuredProduct.image_url?'transparent':'linear-gradient(135deg,rgba(245,158,11,.12),rgba(139,92,246,.08))'}}>
                  {featuredProduct.image_url
                    ? <img src={featuredProduct.image_url} alt={featuredProduct.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <div style={{width:'100%',height:'100%',minHeight:110,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>
                        {isRetail?'🛍':'🍽'}
                      </div>
                  }
                </div>
                <div style={{padding:'14px 16px',flex:1,display:'flex',flexDirection:'column',gap:5}}>
                  {featuredProduct.tag && (
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.acc,textTransform:'uppercase',letterSpacing:'0.1em'}}>
                      {featuredProduct.tag}
                    </span>
                  )}
                  <p style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:C.t1,margin:0,lineHeight:1.2}}>
                    {featuredProduct.name}
                  </p>
                  {featuredProduct.description && (
                    <p style={{fontSize:12.5,color:C.t3,margin:0,lineHeight:1.5,
                      display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                      {featuredProduct.description}
                    </p>
                  )}
                  {featuredProduct.price!=null && (
                    <p style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:C.acc,margin:'2px 0 0'}}>
                      ${featuredProduct.price.toLocaleString('es-AR')}
                    </p>
                  )}
                  {featuredProduct.cta_text&&featuredProduct.cta_url && (
                    <a href={featuredProduct.cta_url} target="_blank" rel="noopener noreferrer" className="hub-btn"
                      style={{marginTop:4,display:'inline-flex',alignItems:'center',
                        background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.2)',
                        color:C.acc,fontSize:12,fontWeight:600,padding:'5px 12px',
                        borderRadius:100,textDecoration:'none',width:'fit-content'}}>
                      {featuredProduct.cta_text}
                    </a>
                  )}
                </div>
              </div>
            </Reveal>
          </section>
        )}


        {/* ══════════════════════════════════════════════════════
            7. GALLERY
        ══════════════════════════════════════════════════════ */}
        {gallery.length>0 && (
          <section id="galeria" style={{padding:'32px 20px 0'}}>
            <Reveal>
              <SL>Galería</SL>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3,borderRadius:16,overflow:'hidden'}}>
                {gallery.slice(0,12).map((item,i)=>(
                  <button key={item.id} className="hub-btn" onClick={()=>setLightboxIndex(i)}
                    style={{aspectRatio:'1',background:'transparent',border:'none',cursor:'pointer',
                      padding:0,position:'relative',overflow:'hidden',display:'block'}}>
                    {item.type==='video'
                      ? <>
                          <video src={item.url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',
                            justifyContent:'center',background:'rgba(0,0,0,.4)'}}>
                            <span style={{width:38,height:38,borderRadius:'50%',background:'rgba(0,0,0,.6)',
                              display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#fff'}}>▶</span>
                          </div>
                        </>
                      : <img src={item.url} alt={item.caption||''} loading="lazy"
                          style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                    }
                  </button>
                ))}
              </div>
            </Reveal>
          </section>
        )}


        {/* ══════════════════════════════════════════════════════
            8. MENU / CATALOG BANNER
        ══════════════════════════════════════════════════════ */}
        <section style={{padding:'28px 20px 0'}}>
          <Reveal>
            <a href={menuHref} className="hub-btn"
              style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'18px 20px',
                background:'linear-gradient(135deg,rgba(245,158,11,.12),rgba(245,158,11,.06))',
                border:'1px solid rgba(245,158,11,.25)',borderRadius:20,textDecoration:'none'}}>
              <div>
                <p style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:C.t1,margin:'0 0 4px'}}>
                  {isRetail?'Ver catálogo completo':'Ver el menú completo'}
                </p>
                <p style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.t3,margin:0}}>
                  {isRetail?'Productos · Precios · Categorías':'Carta · Bebidas · Postres'}
                </p>
              </div>
              <div style={{width:40,height:40,borderRadius:12,background:C.acc,flexShrink:0,marginLeft:12,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{color:'#000',fontSize:18,fontWeight:700}}>→</span>
              </div>
            </a>
          </Reveal>
        </section>


        {/* ══════════════════════════════════════════════════════
            9. HORARIOS (compacto con tooltip)
        ══════════════════════════════════════════════════════ */}
        {hasScheduleData(schedule) && (
          <section style={{padding:'24px 20px 0'}}>
            <Reveal>
              <div style={{...cardBase,overflow:'visible'}}>
                <HorariosCompact schedule={schedule as Record<string,any>} />
              </div>
            </Reveal>
          </section>
        )}


        {/* ══════════════════════════════════════════════════════
            10. LOCATIONS
        ══════════════════════════════════════════════════════ */}
        <section id="locales" style={{padding:'32px 20px 0'}}>
          <Reveal>
            <SL>Locales</SL>
            <div style={{...cardBase,padding:18}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <p style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:C.t1,margin:0}}>{r.name}</p>
                <span style={{padding:'4px 10px',borderRadius:100,fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:500,
                  background:open?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)',
                  border:`1px solid ${open?'rgba(16,185,129,.25)':'rgba(239,68,68,.25)'}`,
                  color:open?C.grn:C.red}}>
                  {open?'Abierto':'Cerrado'}
                </span>
              </div>
              {address && (
                <p style={{fontSize:13.5,color:C.t2,marginBottom:10,display:'flex',alignItems:'flex-start',gap:8,margin:'0 0 10px'}}>
                  <span>📍</span>{address}
                </p>
              )}
              {hoursText && (
                <p style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.t3,marginBottom:14,margin:'0 0 14px'}}>
                  Hoy: {hoursText}
                </p>
              )}
              <div style={{display:'flex',gap:8}}>
                {address && (
                  <a href={`https://maps.google.com/maps?q=${encodeURIComponent(address)}`}
                    target="_blank" rel="noopener noreferrer" className="hub-btn"
                    onClick={()=>trackEvent(r.id,'maps_click')}
                    style={{flex:1,alignItems:'center',justifyContent:'center',gap:5,padding:'10px 8px',
                      borderRadius:12,background:C.acc,color:'#000',fontSize:12.5,fontWeight:600,textDecoration:'none'}}>
                    🗺 Maps
                  </a>
                )}
                {r.phone && (
                  <a href={`tel:${r.phone}`} className="hub-btn"
                    style={{flex:1,alignItems:'center',justifyContent:'center',gap:5,padding:'10px 8px',
                      borderRadius:12,background:C.sur2,border:`1px solid ${C.bdr}`,
                      color:C.t1,fontSize:12.5,fontWeight:600,textDecoration:'none'}}>
                    📞 Llamar
                  </a>
                )}
                {cleanWa && (
                  <a href={`https://wa.me/${cleanWa}`} target="_blank" rel="noopener noreferrer" className="hub-btn"
                    onClick={()=>trackEvent(r.id,'whatsapp_click')}
                    style={{flex:1,alignItems:'center',justifyContent:'center',gap:5,padding:'10px 8px',
                      borderRadius:12,background:C.sur2,border:`1px solid ${C.bdr}`,
                      color:C.t1,fontSize:12.5,fontWeight:600,textDecoration:'none'}}>
                    💬 WA
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        </section>


        {/* ══════════════════════════════════════════════════════
            11. REVIEWS
        ══════════════════════════════════════════════════════ */}
        {(reviews.length>0||googleRating) && (
          <section style={{padding:'32px 20px 0'}}>
            <Reveal>
              <SL>Reseñas</SL>
              {googleRating && (
                <div
                  style={{...cardBase,padding:'20px',marginBottom:10,display:'flex',alignItems:'center',gap:16,
                    cursor:googleReviewUrl?'pointer':'default'}}
                  onClick={()=>{
                    if (googleReviewUrl) {
                      trackEvent(r.id,'link_click')
                      window.open(googleReviewUrl,'_blank','noopener,noreferrer')
                    }
                  }}
                >
                  <div style={{width:40,height:40,borderRadius:'50%',flexShrink:0,
                    background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
                    fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:16,color:'#4285F4'}}>
                    G
                  </div>
                  <div style={{flex:1}}>
                    <p style={{margin:'0 0 2px',fontSize:13.5,fontWeight:600,color:C.t1}}>Google Reviews</p>
                    {googleReviewCount && (
                      <p style={{fontFamily:"'DM Mono',monospace",fontSize:11.5,color:C.t3,margin:0}}>
                        {googleReviewCount} reseñas
                      </p>
                    )}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <span style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:C.acc,lineHeight:1}}>
                      {googleRating}
                    </span>
                    <span style={{color:C.acc,fontSize:20}}>★</span>
                  </div>
                </div>
              )}
              {reviews.length>0 && (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {reviews.map(rev=>(
                    <div key={rev.id} style={{...cardBase,padding:16}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                        <div style={{width:36,height:36,borderRadius:'50%',flexShrink:0,
                          background:`linear-gradient(135deg,${rev.profile_color||C.acc},rgba(139,92,246,.7))`,
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:'#fff'}}>
                          {rev.author_initial||rev.author_name[0]?.toUpperCase()}
                        </div>
                        <div style={{flex:1}}>
                          <p style={{margin:0,fontWeight:600,fontSize:13.5,color:C.t1}}>{rev.author_name}</p>
                          <p style={{margin:0,fontFamily:"'DM Mono',monospace",fontSize:10.5,color:C.t3}}>
                            {rev.relative_time||'Hace poco'} · {starStr(rev.rating)}
                          </p>
                        </div>
                      </div>
                      <p style={{margin:0,fontSize:13.5,color:C.t2,lineHeight:1.6}}>{rev.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {social.google_review && (
                <a href={social.google_review} target="_blank" rel="noopener noreferrer"
                  onClick={()=>trackEvent(r.id,'link_click')}
                  style={{display:'block',textAlign:'center',marginTop:12,
                    fontFamily:"'DM Mono',monospace",fontSize:12.5,color:C.acc,textDecoration:'none'}}>
                  Ver en Google →
                </a>
              )}
            </Reveal>
          </section>
        )}


        {/* ══════════════════════════════════════════════════════
            12. SOCIAL LINKS
        ══════════════════════════════════════════════════════ */}
        {socialEntries.length>0 && (
          <section style={{padding:'32px 20px 0'}}>
            <Reveal>
              <SL>Redes</SL>
              <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(5,socialEntries.length)},1fr)`,gap:8}}>
                {socialEntries.map(s=>(
                  <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" className="hub-btn"
                    onClick={()=>trackEvent(r.id, s.key==='wa'?'whatsapp_click':'link_click')}
                    style={{aspectRatio:'1',borderRadius:16,background:s.bg,
                      border:`1px solid ${s.color}33`,
                      flexDirection:'column',alignItems:'center',justifyContent:'center',
                      textDecoration:'none',gap:4}}>
                    <span style={{fontSize:18}}>{s.icon}</span>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:s.color,fontWeight:500}}>
                      {s.label}
                    </span>
                  </a>
                ))}
              </div>
            </Reveal>
          </section>
        )}


        {/* ══════════════════════════════════════════════════════
            13. CONTACT LIST
        ══════════════════════════════════════════════════════ */}
        {contactItems.length>0 && (
          <section id="contacto" style={{padding:'32px 20px 0'}}>
            <Reveal>
              <SL>Contacto</SL>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {contactItems.map(c=>(
                  <a key={c.label} href={c.href}
                    target={c.href.startsWith('http')?'_blank':undefined}
                    rel="noopener noreferrer" className="hub-btn"
                    onClick={()=>{ if (c.href.includes('wa.me')) trackEvent(r.id,'whatsapp_click') }}
                    style={{...cardBase,padding:'14px 18px',alignItems:'center',gap:14,textDecoration:'none'}}>
                    <div style={{width:40,height:40,borderRadius:12,background:c.iconBg,flexShrink:0,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
                      {c.icon}
                    </div>
                    <div style={{flex:1}}>
                      <p style={{margin:0,fontFamily:"'DM Mono',monospace",fontSize:10,color:C.t3,
                        textTransform:'uppercase',letterSpacing:'0.1em'}}>{c.label}</p>
                      <p style={{margin:'2px 0 0',fontSize:13.5,color:C.t1,fontWeight:500}}>{c.value}</p>
                    </div>
                    <span style={{color:C.t3,fontSize:18,lineHeight:1}}>›</span>
                  </a>
                ))}
              </div>
            </Reveal>
          </section>
        )}


        {/* ══════════════════════════════════════════════════════
            14. FOOTER
        ══════════════════════════════════════════════════════ */}
        <footer style={{margin:'40px 20px 0',padding:'24px 0',
          borderTop:`1px solid ${C.bdr}`,textAlign:'center'}}>
          <p style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:C.t1,margin:'0 0 4px'}}>{r.name}</p>
          {hoursText && <p style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.t3,margin:'0 0 4px'}}>{hoursText}</p>}
          {r.city && <p style={{fontSize:12,color:C.t4,margin:'0 0 16px'}}>{r.city}</p>}
          <a href="https://menulife.digital" target="_blank" rel="noopener noreferrer"
            style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:100,
              background:C.sur,border:`1px solid ${C.bdr}`,textDecoration:'none'}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.t3}}>Powered by</span>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:500,color:C.acc}}>MenuLife</span>
          </a>
        </footer>

        </div>{/* end solid-bg content wrapper */}
      </div>

      {/* BOTTOM NAV */}
      <BottomNav isRetail={isRetail}/>

      {/* GALLERY LIGHTBOX */}
      <AnimatePresence>
        {lightboxIndex!==null && gallery.length>0 && (
          <Lightbox items={gallery} startIndex={lightboxIndex} onClose={()=>setLightboxIndex(null)}/>
        )}
      </AnimatePresence>
    </>
  )
}
