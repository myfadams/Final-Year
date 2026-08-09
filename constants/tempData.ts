import {
  Briefcase,
  Coffee,
  GraduationCap,
  HeartPulse,
  Home,
  MapPin,
} from "lucide-react-native";
import React from "react";
import {
  Article,
  caseProp,
  ContactsProp,
  PendingRequest,
  Person,
  SuggestedResponder,
} from "./interfaces";

export const PEOPLE: Person[] = [
  {
    id: "1",
    name: "Karen Castillo",
    address: "Paradise Regained Hostel, Kumasi",
    avatarColor: "#FF6B6B",
    markerColor: "#FF6B6B",
    latitude: 6.675155,
    longitude: -1.571569,
    urgency: "critical",
    description:
      "Victim is experiencing severe breathing difficulties and chest tightness. Needs immediate oxygen support and medical personnel on site.",
    images: [
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80",
    ],
    requesterDesc:
      "20-year old female student. Known to be asthmatic and highly sensitive to dust.",
    knownHealthProblems: ["Chronic Asthma", "Penicillin Allergy"],
  },
  {
    id: "2",
    name: "Alex Tan",
    address: "Old Library Road, KNUST",
    avatarColor: "#4ECDC4",
    markerColor: "#4ECDC4",
    latitude: 6.671234,
    longitude: -1.562145,
    urgency: "high",
    description:
      "Reported a head injury after slipping on a wet pathway near the central library. Conscious but bleeding slightly from the forehead.",
    images: [
      "https://images.unsplash.com/photo-1579684389782-64d84b5e905d?auto=format&fit=crop&w=400&q=80",
    ],
    requesterDesc: "22-year old male. Chemistry major. Alert and responsive.",
    knownHealthProblems: ["None"],
  },
  {
    id: "3",
    name: "Maria Santos",
    address: "J.A. Kuffour Avenue, KNUST",
    avatarColor: "#A78BFA",
    markerColor: "#A78BFA",
    latitude: 6.674512,
    longitude: -1.566789,
    urgency: "medium",
    description:
      "Suspicious individual spotted loitering around the hostel entrance for over two hours. Resident requests security patrol check.",
    images: [
      "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=400&q=80",
    ],
    requesterDesc: "19-year old female resident of J.A. Kuffour Avenue.",
    knownHealthProblems: ["None"],
  },
  {
    id: "4",
    name: "David Mensah",
    address: "Georgia State Hostel, Kumasi",
    avatarColor: "#F59E0B",
    markerColor: "#F59E0B",
    latitude: 6.685123,
    longitude: -1.572145,
    urgency: "medium",
    description:
      "Power surge in the main distribution panel causing smoke and sparks. Campus electrician required to avoid fire risk.",
    images: [
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80",
    ],
    requesterDesc: "Hostel Warden at Georgia State.",
    knownHealthProblems: ["Diabetes Type 2"],
  },
  {
    id: "5",
    name: "Elena Boateng",
    address: "Asokwa Mall, Kumasi",
    avatarColor: "#EC4899",
    markerColor: "#EC4899",
    latitude: 6.652134,
    longitude: -1.583124,
    urgency: "critical",
    description:
      "Severe allergic reaction (anaphylaxis) from accidental peanut consumption. Epipen has been administered but victim requires transport.",
    images: [
      "https://images.unsplash.com/photo-1628863012283-709ffb77df0c?auto=format&fit=crop&w=400&q=80",
    ],
    requesterDesc:
      "21-year old female student. Currently monitored by a friend.",
    knownHealthProblems: ["Severe Peanut Allergy", "Lactose Intolerance"],
  },
];

export const emergencyAlerts: caseProp[] = [
  {
    id: "1",
    title: "Severe breathing difficulties",
    description:
      "Victim is experiencing severe breathing difficulties and chest tightness. Needs immediate oxygen support.",
    location: "Paradise Regained Hostel, Kumasi",
    distance: 200,
    time: 120,
    responseTime: 180,
    severity: "Critical",
    responders: 4,
    isResolved: false,
    action: "Respond",
    creatorID: "user_001",
    falseAlarm: false,
  },
  {
    id: "2",
    title: "Head injury reported",
    description:
      "Reported a head injury after slipping on a wet pathway near the central library. Conscious but bleeding.",
    location: "Old Library Road, KNUST",
    distance: 400,
    time: 480,
    responseTime: 300,
    severity: "Moderate",
    responders: 2,
    isResolved: false,
    action: "Respond",
    creatorID: "user_002",
    falseAlarm: false,
  },
  {
    id: "3",
    title: "Suspicious individual loitering",
    description:
      "Suspicious individual spotted loitering around the hostel entrance for over two hours.",
    location: "J.A. Kuffour Avenue, KNUST",
    distance: 600,
    time: 900,
    responseTime: 420,
    severity: "Low",
    responders: 1,
    isResolved: false,
    action: "Respond",
    creatorID: "user_003",
    falseAlarm: false,
  },
  {
    id: "4",
    title: "Electrical fire hazard",
    description:
      "Power surge in the main distribution panel causing smoke and sparks.",
    location: "Georgia State Hostel, Kumasi",
    distance: 750,
    time: 1200,
    responseTime: 240,
    severity: "Moderate",
    responders: 3,
    isResolved: false,
    action: "Respond",
    creatorID: "user_004",
    falseAlarm: false,
  },
  {
    id: "5",
    title: "Severe allergic reaction",
    description:
      "Severe allergic reaction (anaphylaxis) from accidental peanut consumption. Epipen administered.",
    location: "Asokwa Mall, Kumasi",
    distance: 1200,
    time: 1500,
    responseTime: 480,
    severity: "Critical",
    responders: 5,
    isResolved: false,
    action: "Respond",
    creatorID: "user_005",
    falseAlarm: false,
  },
  {
    id: "6",
    title: "Fire alarm resolved",
    description: "Smoke cleared and sensor reset",
    location: "Engineering Lab, KNUST",
    distance: 750,
    time: 7200,
    responseTime: 240,
    severity: "Resolved",
    responders: 6,
    isResolved: true,
    action: "",
    creatorID: "sensor_lab_01",
    falseAlarm: false,
  },
  {
    id: "7",
    title: "Medical assistance completed",
    description: "Patient safely transported to hospital",
    location: "Paradise Regained Hostel",
    distance: 50,
    time: 14400,
    responseTime: 180,
    severity: "Resolved",
    responders: 2,
    isResolved: true,
    action: "",
    creatorID: "user_008",
    falseAlarm: false,
  },
];

export const KNUST_PROGRAMMES = [
  // Agriculture (5)
  {
    label: "BSc Agriculture",
    value: "bsc_agriculture",
    description: "Agriculture",
  },
  {
    label: "BSc Aquaculture and Water Resources Management",
    value: "bsc_aquaculture",
    description: "Agriculture",
  },
  {
    label: "BSc Forest Resources Technology",
    value: "bsc_forest_resources",
    description: "Agriculture",
  },
  {
    label: "BSc Landscape Design and Management",
    value: "bsc_landscape_design",
    description: "Agriculture",
  },
  {
    label: "BSc Natural Resources Management",
    value: "bsc_natural_resources",
    description: "Agriculture",
  },

  // Arts (26)
  {
    label: "BA Akan Language and Culture",
    value: "ba_akan_language",
    description: "Arts",
  },
  {
    label: "BA Communication Design",
    value: "ba_communication_design",
    description: "Arts",
  },
  {
    label: "BA Communication Studies",
    value: "ba_communication_studies",
    description: "Arts",
  },
  {
    label: "BA Communication Studies (Evening)",
    value: "ba_communication_studies_evening",
    description: "Arts",
  },
  {
    label: "BA Culture and Tourism",
    value: "ba_culture_tourism",
    description: "Arts",
  },
  { label: "BA English", value: "ba_english", description: "Arts" },
  { label: "BA French", value: "ba_french", description: "Arts" },
  { label: "BA Geography", value: "ba_geography", description: "Arts" },
  { label: "BA History", value: "ba_history", description: "Arts" },
  {
    label: "BA Integrated Rural Art and Industry",
    value: "ba_integrated_rural_art",
    description: "Arts",
  },
  { label: "BA Linguistics", value: "ba_linguistics", description: "Arts" },
  {
    label: "BA Political Studies",
    value: "ba_political_studies",
    description: "Arts",
  },
  {
    label: "BA Religious Studies",
    value: "ba_religious_studies",
    description: "Arts",
  },
  { label: "BA Social Work", value: "ba_social_work", description: "Arts" },
  { label: "BA Sociology", value: "ba_sociology", description: "Arts" },
  {
    label: "BA Sociology (Distance)",
    value: "ba_sociology_distance",
    description: "Arts",
  },
  {
    label: "BFA Painting and Sculpture",
    value: "bfa_painting_sculpture",
    description: "Arts",
  },
  {
    label: "BSc Ceramic Technology",
    value: "bsc_ceramic_technology",
    description: "Arts",
  },
  {
    label: "BSc Fashion Design",
    value: "bsc_fashion_design",
    description: "Arts",
  },
  {
    label: "BSc Industrial Art",
    value: "bsc_industrial_art",
    description: "Arts",
  },
  {
    label: "BSc Metal Product Design Technology",
    value: "bsc_metal_product_design",
    description: "Arts",
  },
  {
    label: "BSc Metalsmithing and Jewellery Technology",
    value: "bsc_metalsmithing_jewellery",
    description: "Arts",
  },
  {
    label: "BSc Painting and Sculpture",
    value: "bsc_painting_sculpture",
    description: "Arts",
  },
  {
    label: "BSc Publishing Studies",
    value: "bsc_publishing_studies",
    description: "Arts",
  },
  {
    label: "BSc Textile Design and Technology",
    value: "bsc_textile_design",
    description: "Arts",
  },
  {
    label: "Diploma in French for Professions",
    value: "diploma_french_professions",
    description: "Arts",
  },

  // Built Environment (6)
  {
    label: "BSc Architecture",
    value: "bsc_architecture",
    description: "Built Environment",
  },
  {
    label: "BSc Construction Technology and Management",
    value: "bsc_construction_tech",
    description: "Built Environment",
  },
  {
    label: "BSc Development Planning",
    value: "bsc_development_planning",
    description: "Built Environment",
  },
  {
    label: "BSc Human Settlement Planning",
    value: "bsc_human_settlement_planning",
    description: "Built Environment",
  },
  {
    label: "BSc Planning",
    value: "bsc_planning",
    description: "Built Environment",
  },
  {
    label: "BSc Quantity Surveying",
    value: "bsc_quantity_surveying",
    description: "Built Environment",
  },

  // Business (22)
  { label: "BBA Accounting", value: "bba_accounting", description: "Business" },
  {
    label: "BBA Accounting (Obuasi Campus)",
    value: "bba_accounting_obuasi",
    description: "Business",
  },
  {
    label: "BBA Banking and Finance",
    value: "bba_banking_finance",
    description: "Business",
  },
  {
    label: "BBA Business Administration",
    value: "bba_business_admin",
    description: "Business",
  },
  {
    label: "BBA Human Resource Management",
    value: "bba_hr_management",
    description: "Business",
  },
  {
    label: "BBA Human Resource Management (Obuasi Campus)",
    value: "bba_hr_management_obuasi",
    description: "Business",
  },
  {
    label: "BBA Logistics and Supply Chain Management",
    value: "bba_logistics_supply_chain",
    description: "Business",
  },
  {
    label: "BBA Logistics and Supply Chain Management (Obuasi Campus)",
    value: "bba_logistics_supply_chain_obuasi",
    description: "Business",
  },
  { label: "BBA Marketing", value: "bba_marketing", description: "Business" },
  {
    label: "BBA Marketing (IDL)",
    value: "bba_marketing_idl",
    description: "Business",
  },
  {
    label: "BBA Marketing (Obuasi Campus)",
    value: "bba_marketing_obuasi",
    description: "Business",
  },
  {
    label: "BSc Accounting (Evening)",
    value: "bsc_accounting_evening",
    description: "Business",
  },
  {
    label: "BSc Accounting (IDL)",
    value: "bsc_accounting_idl",
    description: "Business",
  },
  {
    label: "BSc Agribusiness Management",
    value: "bsc_agribusiness_management",
    description: "Business",
  },
  {
    label: "BSc Business Administration",
    value: "bsc_business_admin",
    description: "Business",
  },
  {
    label: "BSc Business Administration (Evening)",
    value: "bsc_business_admin_evening",
    description: "Business",
  },
  {
    label: "BSc Business Administration (IDL)",
    value: "bsc_business_admin_idl",
    description: "Business",
  },
  {
    label: "BSc Hospitality and Tourism Management",
    value: "bsc_hospitality_tourism",
    description: "Business",
  },
  {
    label: "BSc Procurement & Supply Chain Management (Distance)",
    value: "bsc_procurement_distance",
    description: "Business",
  },
  {
    label: "BSc Procurement and Supply Chain Management (IDL)",
    value: "bsc_procurement_idl",
    description: "Business",
  },
  {
    label: "BSc Real Estate",
    value: "bsc_real_estate",
    description: "Business",
  },
  {
    label: "Diploma in Business Administration",
    value: "diploma_business_admin",
    description: "Business",
  },

  // Computing (1)
  {
    label: "BSc Computer Science (Evening)",
    value: "bsc_computer_science_evening",
    description: "Computing",
  },

  // Education (2)
  {
    label: "BEd Junior High School",
    value: "bed_jhs",
    description: "Education",
  },
  {
    label: "Diploma in Education (Distance)",
    value: "diploma_education_distance",
    description: "Education",
  },

  // Engineering (24)
  {
    label: "BSc Aerospace Engineering",
    value: "bsc_aerospace_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Automobile Engineering",
    value: "bsc_automobile_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Biomedical Engineering",
    value: "bsc_biomedical_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Chemical Engineering",
    value: "bsc_chemical_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Civil Engineering",
    value: "bsc_civil_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Civil Engineering (Obuasi Campus)",
    value: "bsc_civil_engineering_obuasi",
    description: "Engineering",
  },
  {
    label: "BSc Computer Engineering",
    value: "bsc_computer_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Electrical Engineering",
    value: "bsc_electrical_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Electrical Engineering (Obuasi Campus)",
    value: "bsc_electrical_engineering_obuasi",
    description: "Engineering",
  },
  {
    label: "BSc Geological Engineering",
    value: "bsc_geological_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Geological Engineering (Obuasi Campus)",
    value: "bsc_geological_engineering_obuasi",
    description: "Engineering",
  },
  {
    label: "BSc Geomatic Engineering",
    value: "bsc_geomatic_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Geomatic Engineering (Obuasi Campus)",
    value: "bsc_geomatic_engineering_obuasi",
    description: "Engineering",
  },
  {
    label: "BSc Industrial Engineering",
    value: "bsc_industrial_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Marine Engineering",
    value: "bsc_marine_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Materials Engineering",
    value: "bsc_materials_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Materials Engineering (Obuasi Campus)",
    value: "bsc_materials_engineering_obuasi",
    description: "Engineering",
  },
  {
    label: "BSc Mechanical Engineering",
    value: "bsc_mechanical_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Mechanical Engineering (Obuasi Campus)",
    value: "bsc_mechanical_engineering_obuasi",
    description: "Engineering",
  },
  {
    label: "BSc Metallurgical Engineering",
    value: "bsc_metallurgical_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Metallurgical Engineering (Obuasi Campus)",
    value: "bsc_metallurgical_engineering_obuasi",
    description: "Engineering",
  },
  {
    label: "BSc Petroleum Engineering",
    value: "bsc_petroleum_engineering",
    description: "Engineering",
  },
  {
    label: "BSc Telecommunication Engineering",
    value: "bsc_telecommunication_engineering",
    description: "Engineering",
  },
  {
    label: "Diploma in Architectural Technology",
    value: "diploma_architectural_tech",
    description: "Engineering",
  },

  // Health (3)
  {
    label: "BSc Human Biology (Medicine)",
    value: "bsc_human_biology",
    description: "Health",
  },
  {
    label: "BSc Nursing (Obuasi Campus)",
    value: "bsc_nursing_obuasi",
    description: "Health",
  },
  { label: "MBChB Medicine", value: "mbchb_medicine", description: "Health" },

  // Health Sciences (16)
  {
    label: "BSc Dental Surgery",
    value: "bsc_dental_surgery",
    description: "Health Sciences",
  },
  {
    label: "BSc Disability and Rehabilitation Studies",
    value: "bsc_disability_rehab",
    description: "Health Sciences",
  },
  {
    label: "BSc Herbal Medicine",
    value: "bsc_herbal_medicine",
    description: "Health Sciences",
  },
  {
    label: "BSc Medical Imaging",
    value: "bsc_medical_imaging",
    description: "Health Sciences",
  },
  {
    label: "BSc Medical Laboratory Sciences (Obuasi Campus)",
    value: "bsc_med_lab_obuasi",
    description: "Health Sciences",
  },
  {
    label: "BSc Medical Laboratory Technology",
    value: "bsc_med_lab_tech",
    description: "Health Sciences",
  },
  {
    label: "BSc Midwifery",
    value: "bsc_midwifery",
    description: "Health Sciences",
  },
  {
    label: "BSc Midwifery (Obuasi Campus)",
    value: "bsc_midwifery_obuasi",
    description: "Health Sciences",
  },
  {
    label: "BSc Nursing",
    value: "bsc_nursing",
    description: "Health Sciences",
  },
  {
    label: "BSc Physician Assistantship",
    value: "bsc_physician_assistant",
    description: "Health Sciences",
  },
  {
    label: "BSc Physiotherapy and Sports Science",
    value: "bsc_physiotherapy_sports",
    description: "Health Sciences",
  },
  {
    label: "Diploma in Health Communication",
    value: "diploma_health_communication",
    description: "Health Sciences",
  },
  {
    label: "Diploma in Health Information Management",
    value: "diploma_health_info",
    description: "Health Sciences",
  },
  {
    label: "Diploma in Medical Laboratory Science",
    value: "diploma_med_lab_science",
    description: "Health Sciences",
  },
  {
    label: "Doctor of Pharmacy",
    value: "doctor_of_pharmacy",
    description: "Health Sciences",
  },
  {
    label: "DVM Veterinary Medicine",
    value: "dvm_veterinary_medicine",
    description: "Health Sciences",
  },

  // Law (1)
  { label: "LLB Law", value: "llb_law", description: "Law" },

  // Science (21)
  {
    label: "BSc Actuarial Science",
    value: "bsc_actuarial_science",
    description: "Science",
  },
  {
    label: "BSc Agricultural Biotechnology",
    value: "bsc_agric_biotech",
    description: "Science",
  },
  {
    label: "BSc Agricultural Engineering",
    value: "bsc_agric_engineering",
    description: "Science",
  },
  {
    label: "BSc Biochemistry",
    value: "bsc_biochemistry",
    description: "Science",
  },
  {
    label: "BSc Biological Sciences",
    value: "bsc_biological_sciences",
    description: "Science",
  },
  { label: "BSc Chemistry", value: "bsc_chemistry", description: "Science" },
  {
    label: "BSc Computer Science",
    value: "bsc_computer_science",
    description: "Science",
  },
  {
    label: "BSc Environmental Science",
    value: "bsc_environmental_science",
    description: "Science",
  },
  {
    label: "BSc Environmental Sciences (Obuasi Campus)",
    value: "bsc_environmental_science_obuasi",
    description: "Science",
  },
  {
    label: "BSc Food Science",
    value: "bsc_food_science",
    description: "Science",
  },
  {
    label: "BSc Food Science and Technology",
    value: "bsc_food_science_tech",
    description: "Science",
  },
  {
    label: "BSc Land Economy",
    value: "bsc_land_economy",
    description: "Science",
  },
  {
    label: "BSc Mathematics",
    value: "bsc_mathematics",
    description: "Science",
  },
  {
    label: "BSc Meteorology and Climate Science",
    value: "bsc_meteorology_climate",
    description: "Science",
  },
  { label: "BSc Optometry", value: "bsc_optometry", description: "Science" },
  {
    label: "BSc Petrochemical Engineering",
    value: "bsc_petrochemical_engineering",
    description: "Science",
  },
  { label: "BSc Physics", value: "bsc_physics", description: "Science" },
  {
    label: "BSc Sport and Exercise Science",
    value: "bsc_sport_exercise_science",
    description: "Science",
  },
  { label: "BSc Statistics", value: "bsc_statistics", description: "Science" },
  {
    label: "BSc Telecommunications Engineering",
    value: "bsc_telecom_engineering_sci",
    description: "Science",
  },
  {
    label: "Diploma in Food Manufacturing",
    value: "diploma_food_manufacturing",
    description: "Science",
  },

  // Social Science (3)
  {
    label: "BA Economics",
    value: "ba_economics",
    description: "Social Science",
  },
  {
    label: "BA Sociology (IDL)",
    value: "ba_sociology_idl",
    description: "Social Science",
  },
  {
    label: "BA Sociology and Social Work",
    value: "ba_sociology_social_work",
    description: "Social Science",
  },

  // Technology (4)
  {
    label: "BSc Information Technology",
    value: "bsc_information_technology",
    description: "Technology",
  },
  {
    label: "BSc Information Technology (IDL)",
    value: "bsc_information_technology_idl",
    description: "Technology",
  },
  {
    label: "BSc Packaging Technology",
    value: "bsc_packaging_technology",
    description: "Technology",
  },
  {
    label: "Diploma in Information Technology",
    value: "diploma_information_technology",
    description: "Technology",
  },
];

export const LOCATION_OPTIONS = [
  {
    label: "Hostel / Residence (Home)",
    value: "home",
    icon: React.createElement(Home, { size: 20, color: "#1F2937" }),
    description: "Paradise Regained, Unity Hall, Republic Hall, etc.",
  },
  {
    label: "Academic / Lecture Hall (School)",
    value: "school",
    icon: React.createElement(GraduationCap, { size: 20, color: "#1F2937" }),
    description: "Science Block, Engineering Lab, Library, etc.",
  },
  {
    label: "Offices / Departments (Work)",
    value: "work",
    icon: React.createElement(Briefcase, { size: 20, color: "#1F2937" }),
    description: "Administration building, staff quarters, work offices",
  },
  {
    label: "Cafeteria / Social Spaces",
    value: "social",
    icon: React.createElement(Coffee, { size: 20, color: "#1F2937" }),
    description: "Commercial area, food courts, student union building",
  },
  {
    label: "Health Center / Clinic",
    value: "health",
    icon: React.createElement(HeartPulse, { size: 20, color: "#1F2937" }),
    description: "KNUST Hospital, college sickbays, health points",
  },
  {
    label: "Other Campus Coordinates",
    value: "other",
    icon: React.createElement(MapPin, { size: 20, color: "#1F2937" }),
    description: "Open fields, car parks, gates, shuttle terminals",
  },
];

export const DEFAULT_CONTACTS: ContactsProp[] = [
  {
    id: "1",
    initials: "AA",
    name: "Austin Arthur",
    phone: "+44 999 999 999",
    relationship: "Family",
    badgeType: "Family",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop",
    status: "Available",
    statusColor: "#22C55E",
    avatarColor: "#FCE7F3",
    avatarTextColor: "#BE123C",
    category: "Family & Friends",
    isTrustedNetwork: true,
  },
  {
    id: "2",
    initials: "L",
    name: "Lawrence",
    phone: "+44 999 999 999",
    relationship: "Office",
    badgeType: "Office",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=250&auto=format&fit=crop",
    status: "Available",
    statusColor: "#22C55E",
    avatarColor: "#FFEDD5",
    avatarTextColor: "#C2410C",
    category: "Campus & Professional",
    isTrustedNetwork: false,
  },
  {
    id: "3",
    initials: "LM",
    name: "Louis Mason",
    phone: "+44 999 999 999",
    relationship: "Friend",
    badgeType: "Friend",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=250&auto=format&fit=crop",
    status: "Away",
    statusColor: "#F59E0B",
    avatarColor: "#DCFCE7",
    avatarTextColor: "#15803D",
    category: "Family & Friends",
    isTrustedNetwork: false,
  },
  {
    id: "4",
    initials: "KC",
    name: "Karen Castillo",
    phone: "+44 999 888 777",
    relationship: "Roommate",
    badgeType: "Friend",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop",
    status: "Available",
    statusColor: "#22C55E",
    avatarColor: "#EC4899",
    avatarTextColor: "#FFFFFF",
    category: "Family & Friends",
    isTrustedNetwork: true,
  },
  {
    id: "5",
    initials: "CS",
    name: "Campus Security",
    phone: "+44 999 000 111",
    relationship: "Campus Security",
    badgeType: "Campus",
    status: "Available",
    statusColor: "#22C55E",
    avatarColor: "#1E1B4B",
    avatarTextColor: "#FFFFFF",
    category: "Campus & Professional",
    verified: true,
    isTrustedNetwork: true,
  },
  {
    id: "6",
    initials: "HM",
    name: "Helen Miller",
    phone: "+44 999 111 222",
    relationship: "Family",
    badgeType: "Family",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop",
    status: "Available",
    statusColor: "#22C55E",
    avatarColor: "#FCA5A5",
    avatarTextColor: "#991B1B",
    category: "Family & Friends",
    isTrustedNetwork: true,
  },
  {
    id: "7",
    initials: "SV",
    name: "Dr. Sarah Vance",
    phone: "+44 999 555 666",
    relationship: "Academic Office",
    badgeType: "Office",
    avatarUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=250&auto=format&fit=crop",
    status: "Available",
    statusColor: "#22C55E",
    avatarColor: "#FFEDD5",
    avatarTextColor: "#C2410C",
    category: "Campus & Professional",
    verified: true,
    isTrustedNetwork: false,
  },
];

export const DEFAULT_PENDING_REQUESTS: PendingRequest[] = [
  {
    id: "pr-1",
    name: "Sarah Jenkins",
    role: "Medic",
    distance: "1.2mi away",
    avatarUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop",
  },
  {
    id: "pr-2",
    name: "David Chen",
    role: "Volunteer",
    distance: "3.5mi away",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop",
  },
];

export const DEFAULT_SUGGESTED_RESPONDERS: SuggestedResponder[] = [
  {
    id: "sr-1",
    name: "Marcus Thorne",
    role: "Fire Rescue",
    distance: "0.8mi away",
    avatarUrl:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=300&auto=format&fit=crop",
    isOnline: false,
    isRequested: false,
  },
  {
    id: "sr-2",
    name: "Elena Rodriguez",
    role: "EMT Specialist",
    distance: "1.5mi away",
    avatarUrl:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=300&auto=format&fit=crop",
    isOnline: true,
    isRequested: true,
  },
  {
    id: "sr-3",
    name: "Robert King",
    role: "Community Leader",
    distance: "2.1mi away",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop",
    isOnline: false,
    isRequested: false,
  },
];

export const articles: Article[] = [
  {
    id: "1",
    title: "Severe Heat Wave Warning: City-wide Cooling Centers Opened",
    category: "ADVISORY",
    categoryColor: "#D32F2F", // Red
    categoryBg: "#FFDAD6", // Light red
    publisher: "Emergency Services",
    time: "Just now",
    image:
      "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&auto=format&fit=crop&q=80",
    leftAccent: "#D32F2F",
    isFeatured: true,
    content:
      "A severe heatwave is currently impacting the metropolitan area with temperatures expected to rise above 40°C. ResQ and municipal officials have opened 15 cooling centers across the city, equipped with water, air conditioning, and medical staff. Residents are advised to limit outdoor activity between 11 AM and 4 PM, stay hydrated, and check in on elderly neighbors. Critical services remain active.",
  },
  {
    id: "2",
    title: "New Emergency Response Hub Opened",
    category: "OFFICIAL",
    categoryColor: "#1976D2", // Blue
    categoryBg: "#D4E3FF", // Light blue
    publisher: "ResQ Official",
    time: "1h ago",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80",
    leftAccent: "#1976D2",
    content:
      "The new regional emergency operations headquarters is officially open. Designed to improve crisis response times by 30%, this facility centralizes dispatch teams, ambulance crews, and digital coordination personnel in one hub. The hub features advanced mapping screens and satellite backup networks to coordinate disaster responses.",
  },
  {
    id: "3",
    title: "Annual Neighborhood Safety Drill Scheduled",
    category: "COMMUNITY",
    categoryColor: "#FC820C", // Orange
    categoryBg: "#FFDCC6", // Light orange
    publisher: "Local Watch",
    time: "3h ago",
    image:
      "https://images.unsplash.com/photo-1508962914676-134849a727f0?w=600&auto=format&fit=crop&q=80",
    leftAccent: "#FC820C",
    content:
      "Our annual community-wide evacuation and safety drill is scheduled for Saturday at 9:00 AM. In partnership with local fire services, we will simulate a multi-block safety sweep. Community captains will demonstrate emergency supply kit checks and assembly area operations. All residents are highly encouraged to participate in this drill.",
  },
  {
    id: "4",
    title: "Heavy Rainfall Expected Tonight: Flash Floods Warning",
    category: "ADVISORY",
    categoryColor: "#D32F2F", // Red
    categoryBg: "#FFDAD6", // Light red
    publisher: "Weather Service",
    time: "5h ago",
    image:
      "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600&auto=format&fit=crop&q=80",
    leftAccent: "#D32F2F",
    content:
      "The national meteorological bureau has issued a flash flood warning for low-lying areas. Total rain accumulations of 75-100mm are expected within a 6-hour window tonight. Residents should clear gutters, park vehicles on higher ground, and refrain from driving through flooded roads. Rescue personnel have been pre-positioned at flood hotspots.",
  },
];
