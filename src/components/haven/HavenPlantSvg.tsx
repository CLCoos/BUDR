'use client';

import React from 'react';
import TreePlant from '@/components/haven/plants/TreePlant';
import FlowerPlant from '@/components/haven/plants/FlowerPlant';
import HerbPlant from '@/components/haven/plants/HerbPlant';
import BushPlant from '@/components/haven/plants/BushPlant';
import VegetablePlant from '@/components/haven/plants/VegetablePlant';
import type { HavenPlantType } from '@/components/haven/havenConstants';
import { HAVEN_PLANT_ACCENTS } from '@/components/haven/havenConstants';

export type HavenGrowthStage = 0 | 1 | 2 | 3 | 4;

export function HavenPlantSvg({ type, stage }: { type: HavenPlantType; stage: HavenGrowthStage }) {
  const accent = HAVEN_PLANT_ACCENTS[type];
  switch (type) {
    case 'tree':
      return <TreePlant stage={stage} accent={accent} />;
    case 'flower':
      return <FlowerPlant stage={stage} accent={accent} />;
    case 'herb':
      return <HerbPlant stage={stage} accent={accent} />;
    case 'bush':
      return <BushPlant stage={stage} accent={accent} />;
    case 'vegetable':
      return <VegetablePlant stage={stage} accent={accent} />;
  }
}
