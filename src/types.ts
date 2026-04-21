/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ViewMode = 'assets' | 'admin' | 'requests';

export interface RequestItem {
  id: string;
  name: string;
  department: string;
  asset: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

export const INITIAL_REQUESTS: RequestItem[] = [
  { id: '1', name: 'John Doe', department: 'Sales', asset: 'Q3 Sales Deck Template', status: 'pending', date: '2024-05-15' },
  { id: '2', name: 'Jane Smith', department: 'Engineering', asset: 'Product Architecture Icons', status: 'approved', date: '2024-05-10' },
  { id: '3', name: 'Alice Cooper', department: 'Customer Success', asset: 'Onboarding Checklist PDF', status: 'rejected', date: '2024-05-02' }
];

export interface Asset {
  id: string;
  title: string;
  category: string;
  link: string;
  userId?: string;
}

export const ASSET_CATEGORIES = [
  'Brand Assets',
  'Templates',
  'Guidelines',
  'Campaign Materials',
  'Other Resources'
];

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'a1',
    title: "Primary Logo Kit (PNG/SVG)",
    category: "Brand Assets",
    link: "https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing"
  },
  {
    id: 'a2',
    title: "Full Brand Guidelines 2024",
    category: "Guidelines",
    link: "https://drive.google.com/file/d/1DEF456uvw/view?usp=sharing"
  },
  {
    id: 'a3',
    title: "Email Template Pack",
    category: "Templates",
    link: "https://drive.google.com/drive/folders/1GHI789rst?usp=sharing"
  },
  {
    id: 'a4',
    title: "Social Media Templates",
    category: "Templates",
    link: "https://drive.google.com/drive/folders/1JKL012mno?usp=sharing"
  },
  {
    id: 'a5',
    title: "Q4 Campaign Assets",
    category: "Campaign Materials",
    link: "https://drive.google.com/drive/folders/1PQRS345tuv?usp=sharing"
  },
  {
    id: 'a6',
    title: "Certificate Templates",
    category: "Templates",
    link: "https://drive.google.com/drive/folders/1WXYZ678abc?usp=sharing"
  },
  {
    id: 'a7',
    title: "Color Palette & Fonts",
    category: "Brand Assets",
    link: "https://drive.google.com/file/d/1MNO987def/view?usp=sharing"
  },
  {
    id: 'a8',
    title: "Icon Library",
    category: "Brand Assets",
    link: "https://drive.google.com/drive/folders/1TUV456ghi?usp=sharing"
  }
];
