// Current season options — maps DB value to display label
export const CURRENT_SEASONS: { value: string; label: string; emoji: string }[] = [
  { value: "in_transition",      label: "In transition",           emoji: "🔄" },
  { value: "building_something", label: "Building something new",  emoji: "🔨" },
  { value: "exploring_ideas",    label: "Exploring ideas",         emoji: "🧭" },
  { value: "looking_for_role",   label: "Looking for a new role",  emoji: "🔍" },
  { value: "growing_in_role",    label: "Growing in my current role", emoji: "📈" },
  { value: "taking_a_break",     label: "Taking a break",          emoji: "☀️" },
];

// Hoping for options — maps DB value to display label
export const HOPING_FOR: { value: string; label: string; description: string }[] = [
  { value: "collaborator",     label: "A collaborator",       description: "Someone to build or work on something with" },
  { value: "new_perspective",  label: "A new perspective",    description: "Ideas or angles I haven't considered" },
  { value: "advice",           label: "Advice",               description: "Guidance from someone who's been there" },
  { value: "good_conversation", label: "Just good conversation", description: "No agenda — just interesting people" },
];
