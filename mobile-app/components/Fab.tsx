import React from 'react'

// Temporary hotfix: render nothing so legacy <Fab /> calls become no-ops
export default function Fab(): JSX.Element | null {
  return null
}
