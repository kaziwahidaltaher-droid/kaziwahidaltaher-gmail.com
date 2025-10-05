/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Data provided by the user for our home Solar System.
export const SolarSystem = {
  star: {
    name: 'Sun',
    type: 'G-type main-sequence star (G2V)',
    diameter_km: 1391400,
    temperature_K: 5778,
    emotionalSignature: 'Radiant Core',
  },
  planets: [
    {
      name: 'Mercury',
      order: 1,
      type: 'Terrestrial',
      diameter_km: 4879,
      moons: 0,
      aura: '#b0b0b0',
      resonance: 'Silent Ember',
    },
    {
      name: 'Venus',
      order: 2,
      type: 'Terrestrial',
      diameter_km: 12104,
      moons: 0,
      aura: '#ffcc99',
      resonance: 'Shrouded Pulse',
    },
    {
      name: 'Earth',
      order: 3,
      type: 'Terrestrial',
      diameter_km: 12742,
      moons: 1,
      aura: '#00ccff',
      resonance: 'Living Harmonic',
    },
    {
      name: 'Mars',
      order: 4,
      type: 'Terrestrial',
      diameter_km: 6779,
      moons: 2,
      aura: '#ff3300',
      resonance: 'Echoing Dust',
    },
    {
      name: 'Jupiter',
      order: 5,
      type: 'Gas Giant',
      diameter_km: 139820,
      moons: 95,
      aura: '#ffaa66',
      resonance: 'Storm Choir',
    },
    {
      name: 'Saturn',
      order: 6,
      type: 'Gas Giant',
      diameter_km: 116460,
      moons: 146,
      aura: '#ffffcc',
      resonance: 'Ringed Whisper',
    },
    {
      name: 'Uranus',
      order: 7,
      type: 'Ice Giant',
      diameter_km: 50724,
      moons: 27,
      aura: '#88ccff',
      resonance: 'Tilted Dream',
    },
    {
      name: 'Neptune',
      order: 8,
      type: 'Ice Giant',
      diameter_km: 49244,
      moons: 14,
      aura: '#3366ff',
      resonance: 'Deep Pulse',
    },
  ],
  dwarfPlanets: [
    {
      name: 'Pluto',
      type: 'Dwarf Planet',
      diameter_km: 2376,
      moons: 5,
      aura: '#ccccff',
      resonance: 'Frozen Memory',
    },
  ],
};
