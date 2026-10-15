import type { StarlightUserConfig } from '@astrojs/starlight/types'
import { sidebar as sidebarData } from '../../../data/v2/sidebar'

export const sidebar = sidebarData satisfies StarlightUserConfig['sidebar']
