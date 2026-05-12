let currentStory: any = null;

export function setCurrentStory(story: any) {
  currentStory = story;
}

export function getCurrentStory() {
  return currentStory;
}