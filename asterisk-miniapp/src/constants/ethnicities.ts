interface EthnicityOption {
  label: string
  subgroups?: EthnicityOption[]
}

export const ethnicityGroups: EthnicityOption[] = [
  {
    label: 'America',
    subgroups: [
      {
        label: 'Patagonian and Austral',
        subgroups: [
          { label: 'Mapuche' },
          { label: 'Tehuelche' },
          { label: 'Pampas' },
          { label: 'Yagán' }
        ]
      },
      {
        label: 'Andean',
        subgroups: [
          { label: 'Quechua' },
          { label: 'Aymara' },
          { label: 'Kolla' },
          { label: 'Diaguitas' }
        ]
      },
      {
        label: 'Guaraní-Tupí',
        subgroups: [
          { label: 'Tupí' },
          { label: 'Guaraní' },
          { label: 'Charrúa' }
        ]
      },
      {
        label: 'Amazonian',
        subgroups: [
          { label: 'Various Amazonian peoples' }
        ]
      },
      {
        label: 'Andean-Equatorial',
        subgroups: [
          { label: 'Sápara' },
          { label: 'Tsáchila' }
        ]
      },
      {
        label: 'Central American-Indigenous',
        subgroups: [
          { label: 'Wayuu' },
          { label: 'Garífuna' },
          { label: 'Boruca' },
          { label: 'Xinca' },
          { label: 'Lenca' }
        ]
      },
      {
        label: 'Maya-Yucatec',
        subgroups: [
          { label: 'Mayans from Yucatán' }
        ]
      },
      {
        label: 'Aztec-Nahua',
        subgroups: [
          { label: 'Aztecs' },
          { label: 'Nahuas' }
        ]
      },
      {
        label: 'Caribbean-Indigenous',
        subgroups: [
          { label: 'Caribbean' },
          { label: 'Taíno' }
        ]
      },
      {
        label: 'Native American North',
        subgroups: [
          { label: 'Apache' },
          { label: 'Navajo' },
          { label: 'Cherokee' },
          { label: 'Iroquois' },
          { label: 'Sioux' }
        ]
      },
      {
        label: 'Inuit',
        subgroups: [
          { label: 'Inuit' }
        ]
      }
    ]
  },
  {
    label: 'Europe',
    subgroups: [
      {
        label: 'Italic',
        subgroups: [
          { label: 'Southern Italian' },
          { label: 'Northern Italian' }
        ]
      },
      {
        label: 'Hispanic',
        subgroups: [
          { label: 'Spanish' },
          { label: 'Catalan' },
          { label: 'Basque' }
        ]
      },
      {
        label: 'Lusitanian',
        subgroups: [
          { label: 'Portuguese' },
          { label: 'Galician' }
        ]
      },
      {
        label: 'Gallic',
        subgroups: [
          { label: 'French' }
        ]
      },
      {
        label: 'Sardinian',
        subgroups: [
          { label: 'Sardinian' }
        ]
      },
      {
        label: 'Balkan',
        subgroups: [
          { label: 'Serbian' },
          { label: 'Croatian' },
          { label: 'Bosnian' },
          { label: 'Slovenian' },
          { label: 'Montenegrin' },
          { label: 'Macedonian' },
          { label: 'Bulgarian' }
        ]
      },
      {
        label: 'Celtic',
        subgroups: [
          { label: 'Western Celtic (Breton)' },
          { label: 'Insular Celtic (Scottish, Welsh)' },
          { label: 'Irish Celtic' }
        ]
      },
      {
        label: 'Anglo',
        subgroups: [
          { label: 'English' }
        ]
      },
      {
        label: 'Baltic',
        subgroups: [
          { label: 'Lithuanian' },
          { label: 'Latvian' }
        ]
      },
      {
        label: 'Finnic',
        subgroups: [
          { label: 'Finnish' },
          { label: 'Estonian' }
        ]
      },
      {
        label: 'Germanic',
        subgroups: [
          { label: 'German' },
          { label: 'Austrian' },
          { label: 'Swiss-German' },
          { label: 'Luxembourgish' }
        ]
      },
      {
        label: 'Hellenic-Balkan',
        subgroups: [
          { label: 'Greek' },
          { label: 'Albanian' }
        ]
      },
      {
        label: 'Nordic',
        subgroups: [
          { label: 'Icelandic' },
          { label: 'Greenlandic' },
          { label: 'Danish' },
          { label: 'Norwegian' },
          { label: 'Swedish' }
        ]
      },
      {
        label: 'Central European',
        subgroups: [
          { label: 'Polish' },
          { label: 'Czech' },
          { label: 'Slovak' },
          { label: 'Hungarian' },
          { label: 'Romanian' },
          { label: 'Moldovan' }
        ]
      },
      {
        label: 'Eastern Slavic',
        subgroups: [
          { label: 'Russian' },
          { label: 'Ukrainian' },
          { label: 'Belarusian' }
        ]
      },
      {
        label: 'Frisian-Dutch',
        subgroups: [
          { label: 'Dutch' },
          { label: 'Frisian' }
        ]
      },
      {
        label: 'Other European',
        subgroups: [
          { label: 'Maltese' },
          { label: 'Sami' }
        ]
      },
      {
        label: 'Jewish',
        subgroups: [
          { label: 'Western Ashkenazi' },
          { label: 'Eastern Ashkenazi' }
        ]
      },
      {
        label: 'Romani',
        subgroups: [
          { label: 'Sinti (Central Europe)' },
          { label: 'Kale (Spain, Portugal, France)' },
          { label: 'Romanichal (UK, Ireland)' },
          { label: 'Ruska Roma (Russia, Eastern Europe)' },
          { label: 'Balkan Romani' }
        ]
      }
    ]
  },
  {
    label: 'Asia',
    subgroups: [
      {
        label: 'Levantine',
        subgroups: [
          { label: 'Lebanese' },
          { label: 'Syrian' },
          { label: 'Palestinian' },
          { label: 'Jordanian' }
        ]
      },
      {
        label: 'Gulf Arab',
        subgroups: [
          { label: 'Saudi' },
          { label: 'Emirati' },
          { label: 'Qatari' },
          { label: 'Kuwaiti' },
          { label: 'Omani' },
          { label: 'Bahraini' }
        ]
      },
      {
        label: 'Other Middle Eastern',
        subgroups: [
          { label: 'Iraqi' },
          { label: 'Persian (Iranian)' },
          { label: 'Turkish' },
          { label: 'Kurdish' }
        ]
      },
      {
        label: 'Caucasian',
        subgroups: [
          { label: 'Armenian' },
          { label: 'Circassian' },
          { label: 'Georgian' },
          { label: 'Azerbaijani' }
        ]
      },
      {
        label: 'Central Asian',
        subgroups: [
          { label: 'Kazakh' },
          { label: 'Uzbek' },
          { label: 'Turkmen' },
          { label: 'Kyrgyz' },
          { label: 'Tajik' },
          { label: 'Tatar' }
        ]
      },
      {
        label: 'South Asian',
        subgroups: [
          { label: 'North Indian' },
          { label: 'South Indian' },
          { label: 'Pakistani' },
          { label: 'Punjabi' },
          { label: 'Pashtun' },
          { label: 'Bangladeshi' },
          { label: 'Nepali' },
          { label: 'Bhutanese' },
          { label: 'Sri Lankan' }
        ]
      },
      {
        label: 'East Asian',
        subgroups: [
          { label: 'Han Chinese' },
          { label: 'Mongolian' },
          { label: 'Korean' },
          { label: 'Japanese' },
          { label: 'Tibetan' }
        ]
      },
      {
        label: 'Southeast Asian',
        subgroups: [
          { label: 'Filipino' },
          { label: 'Indonesian' },
          { label: 'Malay' },
          { label: 'Vietnamese' },
          { label: 'Thai' },
          { label: 'Burmese' },
          { label: 'Cambodian' },
          { label: 'Laotian' }
        ]
      },
      {
        label: 'Asian Jewish',
        subgroups: [
          { label: 'Caucasian Jewish' },
          { label: 'Mizrahi Jewish' },
          { label: 'Bene Israel Jewish' },
          { label: 'Cochin Jewish' },
          { label: 'Bukharan Jewish' },
          { label: 'Yemenite Jewish' }
        ]
      },
      {
        label: 'Asian Romani',
        subgroups: [
          { label: 'Dom (Turkey, Middle East)' },
          { label: 'Nawar (Lebanon, Syria, Jordan, Iraq)' },
          { label: 'Zargari (Iran)' }
        ]
      }
    ]
  },
  {
    label: 'Africa',
    subgroups: [
      {
        label: 'North African',
        subgroups: [
          { label: 'Egyptian' },
          { label: 'Moroccan' },
          { label: 'Algerian' },
          { label: 'Tunisian' },
          { label: 'Libyan' }
        ]
      },
      {
        label: 'Northeast African',
        subgroups: [
          { label: 'Sudanese' },
          { label: 'Nubian' },
          { label: 'Somali' },
          { label: 'Djiboutian' },
          { label: 'Ethiopian' },
          { label: 'Eritrean' }
        ]
      },
      {
        label: 'West African',
        subgroups: [
          { label: 'Yoruba' },
          { label: 'Igbo' },
          { label: 'Akan' },
          { label: 'Wolof' },
          { label: 'Fulani' }
        ]
      },
      {
        label: 'Central African',
        subgroups: [
          { label: 'Bakongo' },
          { label: 'Luba' },
          { label: 'Mongo' }
        ]
      },
      {
        label: 'East African',
        subgroups: [
          { label: 'Kenyan' },
          { label: 'Tanzanian' },
          { label: 'Maasai' },
          { label: 'Kikuyu' }
        ]
      },
      {
        label: 'Southern African',
        subgroups: [
          { label: 'Zulu' },
          { label: 'Xhosa' },
          { label: 'Sotho' },
          { label: 'Tswana' }
        ]
      },
      {
        label: 'Other African Groups',
        subgroups: [
          { label: 'San (Bushmen)' },
          { label: 'Malagasy' },
          { label: 'Amazigh (Berber)' },
          { label: 'Pygmy' }
        ]
      },
      {
        label: 'African Jewish',
        subgroups: [
          { label: 'Ethiopian Jewish (Beta Israel)' },
          { label: 'North African Jewish' }
        ]
      }
    ]
  },
  {
    label: 'Oceania',
    subgroups: [
      {
        label: 'Australian',
        subgroups: [
          { label: 'Australian Aboriginal' }
        ]
      },
      {
        label: 'Polynesian',
        subgroups: [
          { label: 'Maori' },
          { label: 'Samoan' },
          { label: 'Tongan' },
          { label: 'Niuean' },
          { label: 'Hawaiian' },
          { label: 'Tahitian' },
          { label: 'Rapa Nui' }
        ]
      },
      {
        label: 'Melanesian',
        subgroups: [
          { label: 'Fijian' },
          { label: 'Vanuatuan' },
          { label: 'Papuan' }
        ]
      },
      {
        label: 'Micronesian',
        subgroups: [
          { label: 'Chamorro' },
          { label: 'Carolinian' },
          { label: 'Marshallese' }
        ]
      }
    ]
  },
  {
    label: 'Prefer not to say',
    subgroups: [
      {
        label: 'Prefer not to say',
        subgroups: [
          { label: 'Prefer not to say' }
        ]
      }
    ]
  }
]

export type EthnicityPath = {
  continent: string
  region: string
  ethnicity: string
} 

// grab each 2nd level sub group and make it a new array
export const ethnicityRegions = ethnicityGroups.map(group => group.subgroups).flat()

// grab each 3rd level sub group and make it a new array
export const ethnicitySubgroups = ethnicityGroups.map(group => group.subgroups).flat().map(subgroup => subgroup?.subgroups).flat()


