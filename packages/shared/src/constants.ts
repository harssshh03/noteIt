// Used by BOTH the website and the API, so they can never disagree.
export const PAPERS = ["ruled", "plain", "grid", "dots"] as const;
export type Paper = (typeof PAPERS)[number];

export const MOODS = ["happy", "calm", "excited", "tired", "sad", "grateful"] as const;
export type Mood = (typeof MOODS)[number];
