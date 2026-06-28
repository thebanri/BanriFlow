import React from "react"

export function Card({ className, ...props }) {
  return (
    <div
      className={`rounded-xl border border-slate-800/80 bg-slate-950/60 text-slate-100 shadow-xl glass transition-all duration-300 ${className || ""}`}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={`flex flex-col space-y-1.5 p-6 ${className || ""}`}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={`font-semibold leading-none tracking-tight text-lg text-slate-100 ${className || ""}`}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }) {
  return (
    <p
      className={`text-sm text-slate-400 mt-1 ${className || ""}`}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }) {
  return <div className={`p-6 pt-0 ${className || ""}`} {...props} />
}

export function CardFooter({ className, ...props }) {
  return (
    <div
      className={`flex items-center p-6 pt-0 border-t border-slate-900/60 mt-4 ${className || ""}`}
      {...props}
    />
  )
}
