import type { ComponentType } from 'react'

export const lazyImport = async <T extends { default: ComponentType }>(
  factory: () => Promise<T>,
): Promise<{ Component: ComponentType }> => {
  const module = await factory()
  return { Component: module.default }
}
