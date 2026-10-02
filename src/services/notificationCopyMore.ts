import type { CapacityMode, NotificationPersonality } from "../models/types";

// Extra notification wording, merged into the base banks in notificationCopy.ts.
// Placeholders: {task}, {timing} ("tomorrow", "in about 1 hour", "now"...), {prep}, {capacity}.
// Lines are written so they read naturally whatever the timing is.

export type MoreCopy = {
  titles: string[];
  general: string[];
  work: string[];
  gym: string[];
  chores: string[];
  selfCare: string[];
  focus: string[];
  // A short closing line added to most notifications, matched to her energy check.
  encouragement: Record<CapacityMode, string[]>;
};

export const moreCopy: Record<NotificationPersonality, MoreCopy> = {
  bestie: {
    titles: ["You've got this", "Bestie check-in", "Proud of you", "Little reminder, love", "Main character moment", "Hey gorgeous"],
    general: [
      "{task} is {timing}. You've got this, bestie.",
      "Heads-up, love: {task} is {timing}. I know you can do it.",
      "{task} is coming up {timing}. Look at you, staying on top of things.",
      "Bestie, {task} is {timing}. Future you is already grateful.",
      "Reminder from your biggest fan: {task} is {timing}.",
      "{task} is {timing}. You've handled harder things than this.",
      "Okay superstar, {task} is {timing}. Let's show up for you.",
      "{task} is on the plan {timing}. Small steps still count, love.",
      "Psst. {task} is {timing}. You're doing better than you think.",
      "{task} is {timing}. Deep breath, you've totally got this.",
      "Love, {task} is {timing}. Proud of you for keeping going.",
      "{task} is {timing}. Remember why you planned it, you clever thing."
    ],
    work: [
      "Work is {timing}, bestie. {prep}, and you're ready to shine.",
      "Work is {timing}. You're going to smash this shift.",
      "Shift is {timing}, love. You've got this, one hour at a time.",
      "Work is {timing}. Pack the {prep} and go be brilliant.",
      "Work is {timing}. Future you will be so glad you prepped early.",
      "Bestie, work is {timing}. Hardworking and gorgeous, as usual."
    ],
    gym: [
      "Gym is {timing}, bestie. Your body will thank you for this.",
      "Gym is {timing}. Showing up is the hardest part, and you've got it.",
      "Gym is {timing}. {prep}, then go be that girl.",
      "Gym is {timing}, love. Every session counts, even the gentle ones.",
      "Gym is {timing}. Strong looks good on you.",
      "Bestie, gym is {timing}. Go in, do your best, come home proud."
    ],
    chores: [
      "{task} is {timing}. Future you is going to love walking into this.",
      "{task} is {timing}, love. Done is better than perfect.",
      "{task} is {timing}. Put a song on and make it easy.",
      "{task} is {timing}. Little wins like this add up, bestie.",
      "{task} is {timing}. You're taking such good care of your life.",
      "{task} is {timing}. Ten minutes still counts, I promise."
    ],
    selfCare: [
      "{task} is {timing}. You deserve this time, love.",
      "{task} is {timing}. Rest is not lazy, it's how you keep shining.",
      "{task} is {timing}. Be as kind to yourself as you are to everyone else.",
      "{task} is {timing}, bestie. Phone down, shoulders down.",
      "{task} is {timing}. You've worked hard, so let this be soft.",
      "{task} is {timing}. Filling your cup is part of the plan."
    ],
    focus: [
      "{task} is {timing}. You're more ready than you feel, love.",
      "{task} is {timing}. One step at a time, and you've got this.",
      "{task} is {timing}. I believe in you, bestie.",
      "{task} is {timing}. You planned ahead, which means you're winning.",
      "{task} is {timing}. Breathe, check the details, you're ready.",
      "{task} is {timing}. Clever, capable and organised. That's you."
    ],
    encouragement: {
      high: [
        "You've got this!",
        "Let's go, bestie!",
        "I know you can do it.",
        "Main character energy today.",
        "Go get it, superstar.",
        "Nothing can stop you today.",
        "Proud of you already."
      ],
      normal: [
        "You've got this.",
        "I know you can do it.",
        "Proud of you, love.",
        "One step at a time.",
        "You're doing amazing.",
        "Future you says thank you.",
        "Keep going, bestie."
      ],
      tired: [
        "Go gently, love. You've still got this.",
        "Even a little bit counts today.",
        "Be soft with yourself. You're doing enough.",
        "Small steps are still steps, bestie.",
        "Proud of you for showing up at all.",
        "You don't have to be perfect, just kind to yourself."
      ],
      survival: [
        "Just the essentials, love. That's enough.",
        "You're doing so well just getting through.",
        "One tiny thing, then rest. You've got this.",
        "Be extra kind to yourself today.",
        "Doing the minimum is still doing it, bestie.",
        "I'm proud of you for keeping going."
      ]
    }
  },
  gentle: {
    titles: ["You're doing well", "A kind reminder", "Gently now", "Take your time", "A calm nudge", "Here for you"],
    general: [
      "{task} is {timing}. You are more capable than you think.",
      "A gentle note: {task} is {timing}. You've got this.",
      "{task} is {timing}. Take it one calm step at a time.",
      "{task} is on your plan {timing}. Every small step matters.",
      "{task} is {timing}. Trust yourself, you know what to do.",
      "Softly reminding you: {task} is {timing}. You're doing well.",
      "{task} is {timing}. Go at your own pace.",
      "{task} is {timing}. You planned this with care, and that shows.",
      "{task} is {timing}. Breathe in, breathe out, then begin.",
      "{task} is {timing}. There's no rush, just steady progress.",
      "{task} is {timing}. You're allowed to start small.",
      "{task} is {timing}. I know you can do this."
    ],
    work: [
      "Work is {timing}. Take a breath, gather {prep}, and you're ready.",
      "Work is {timing}. You bring so much to every shift.",
      "Work is {timing}. One calm step at a time, you've got this.",
      "Work is {timing}. Be proud of how hard you work.",
      "Work is {timing}. A little prep now makes the day feel lighter.",
      "Work is {timing}. You've done this many times, and you'll do it well."
    ],
    gym: [
      "Gym is {timing}. Moving your body is a kind thing to do for yourself.",
      "Gym is {timing}. Go at your own pace, it all counts.",
      "Gym is {timing}. You don't have to be perfect, just present.",
      "Gym is {timing}. Gather {prep} when you're ready.",
      "Gym is {timing}. Every session builds a stronger you.",
      "Gym is {timing}. You'll feel lovely afterwards."
    ],
    chores: [
      "{task} is {timing}. A calm space is a calm mind.",
      "{task} is {timing}. Start with the easiest part.",
      "{task} is {timing}. Whatever you get done is enough.",
      "{task} is {timing}. You're looking after your future self.",
      "{task} is {timing}. Gentle progress is still progress.",
      "{task} is {timing}. You'll be glad it's done."
    ],
    selfCare: [
      "{task} is {timing}. You deserve this rest.",
      "{task} is {timing}. Caring for yourself is never wasted time.",
      "{task} is {timing}. Let yourself slow down.",
      "{task} is {timing}. You've been working hard, so be gentle now.",
      "{task} is {timing}. This time is just for you.",
      "{task} is {timing}. Rest helps everything else go better."
    ],
    focus: [
      "{task} is {timing}. You're well prepared, trust that.",
      "{task} is {timing}. Take it slowly, you know more than you think.",
      "{task} is {timing}. One clear step is all you need.",
      "{task} is {timing}. You've got this, calmly and steadily.",
      "{task} is {timing}. Be proud of planning ahead.",
      "{task} is {timing}. Breathe. You can handle this."
    ],
    encouragement: {
      high: [
        "You've got this.",
        "I know you can do it.",
        "Enjoy the energy today.",
        "You're doing wonderfully.",
        "Let today be a good one.",
        "Believe in yourself."
      ],
      normal: [
        "You've got this.",
        "I know you can do it.",
        "You're doing well.",
        "One calm step at a time.",
        "Be proud of yourself.",
        "Steady and kind, that's enough."
      ],
      tired: [
        "Go gently. Whatever you manage is enough.",
        "It's okay to take it slowly today.",
        "Rest when you need to. You're still doing well.",
        "Be kind to yourself today.",
        "Small and steady still counts.",
        "You don't have to do it all."
      ],
      survival: [
        "Just the essentials today, and that's okay.",
        "You're doing your best, and that is enough.",
        "One small thing at a time.",
        "Please be gentle with yourself.",
        "Getting through today is an achievement.",
        "You matter more than the to-do list."
      ]
    }
  },
  coach: {
    titles: ["You've got this", "Game time", "Let's go", "Show up", "Momentum", "Keep pushing"],
    general: [
      "{task} is {timing}. You've got this. Execute.",
      "{task} is {timing}. Discipline today, pride tomorrow.",
      "{task} is {timing}. Show up for yourself.",
      "{task} is {timing}. Progress over perfection.",
      "{task} is {timing}. You're stronger than your excuses.",
      "{task} is {timing}. Lock in and get it done.",
      "{task} is {timing}. Every rep, every task, it all adds up.",
      "{task} is {timing}. Prepare well, perform well.",
      "{task} is {timing}. You made the plan. Now own it.",
      "{task} is {timing}. Consistency is your superpower.",
      "{task} is {timing}. I know you can do it. Go.",
      "{task} is {timing}. Start strong, finish proud."
    ],
    work: [
      "Work is {timing}. {prep}. Then go handle business.",
      "Work is {timing}. Show up, do your best, be proud.",
      "Work is {timing}. Prepare now and walk in ready.",
      "Work is {timing}. You've trained for this. You've got it.",
      "Work is {timing}. Professional, prepared, unstoppable.",
      "Work is {timing}. Strong start, strong shift."
    ],
    gym: [
      "Gym is {timing}. No excuses, just effort.",
      "Gym is {timing}. Show up and the results will follow.",
      "Gym is {timing}. {prep}. Then give it your best.",
      "Gym is {timing}. Stronger every session.",
      "Gym is {timing}. You never regret a workout.",
      "Gym is {timing}. Let's get it. You've got this."
    ],
    chores: [
      "{task} is {timing}. Knock it out and move on.",
      "{task} is {timing}. Small wins build big weeks.",
      "{task} is {timing}. Get it done, then enjoy the reset.",
      "{task} is {timing}. Discipline in the little things counts.",
      "{task} is {timing}. Fast, focused, finished.",
      "{task} is {timing}. Handle it. You've got this."
    ],
    selfCare: [
      "{task} is {timing}. Recovery builds strength. Take it.",
      "{task} is {timing}. Rest is part of the training.",
      "{task} is {timing}. Recharge properly, come back stronger.",
      "{task} is {timing}. Protect your energy.",
      "{task} is {timing}. Champions rest too.",
      "{task} is {timing}. Look after the athlete, which is you."
    ],
    focus: [
      "{task} is {timing}. Prepare, focus, deliver.",
      "{task} is {timing}. You're ready. Trust your preparation.",
      "{task} is {timing}. Head down, one step at a time.",
      "{task} is {timing}. Pressure is a privilege. You've got this.",
      "{task} is {timing}. Stay sharp and stay ahead.",
      "{task} is {timing}. Clear head, clear plan, go."
    ],
    encouragement: {
      high: [
        "Let's go!",
        "You've got this. Full send.",
        "Big energy today. Use it.",
        "Nothing stops you today.",
        "Go win the day.",
        "I know you can do it."
      ],
      normal: [
        "You've got this.",
        "I know you can do it.",
        "Stay consistent.",
        "Keep the momentum.",
        "One step, then the next.",
        "Proud of the work you're putting in."
      ],
      tired: [
        "Low energy day. Do what you can, that's a win.",
        "Steady effort beats no effort. You've got this.",
        "Keep it light today, but keep showing up.",
        "Smart, not hard, today.",
        "Pace yourself. You're still in the game.",
        "A small session still counts."
      ],
      survival: [
        "Essentials only. That's the win today.",
        "Survive, rest, recover. Then go again.",
        "One small action. That's enough.",
        "You're still here and still trying. Respect.",
        "Protect your energy today.",
        "Today is about getting through. You can."
      ]
    }
  },
  professional: {
    titles: ["Upcoming", "Planned activity", "Schedule update", "Friendly reminder", "Today's plan", "Next on your schedule"],
    general: [
      "{task} is scheduled {timing}. You are well prepared.",
      "Friendly reminder: {task} is {timing}. You have this in hand.",
      "{task} is planned {timing}. Thank you for staying organised.",
      "{task} is {timing}. A little preparation now will help.",
      "Upcoming: {task}, {timing}. You're on track.",
      "{task} is {timing}. Your planning is paying off.",
      "Reminder: {task} is {timing}. Take it one step at a time.",
      "{task} is {timing}. You are managing your time well.",
      "{task} is {timing}. Please allow a few minutes to prepare.",
      "{task} is {timing}. You are making steady progress.",
      "{task} is on your schedule {timing}. Keep up the good work.",
      "{task} is {timing}. Confidence comes from preparation, and you've prepared."
    ],
    work: [
      "Work is scheduled {timing}. Please prepare {prep}.",
      "Work is {timing}. Your hard work is appreciated.",
      "Work is {timing}. A calm start sets the tone for the day.",
      "Work is {timing}. You are well prepared for this shift.",
      "Work is {timing}. Please allow time for travel.",
      "Work is {timing}. Wishing you a good shift."
    ],
    gym: [
      "Gym is scheduled {timing}. Please prepare {prep}.",
      "Gym is {timing}. Consistency brings results.",
      "Gym is {timing}. Your commitment is commendable.",
      "Gym is {timing}. Remember to stay hydrated.",
      "Gym is {timing}. Every session supports your wellbeing.",
      "Gym is {timing}. Wishing you a good session."
    ],
    chores: [
      "{task} is scheduled {timing}. Please prepare {prep}.",
      "{task} is {timing}. Small tasks keep the week running smoothly.",
      "{task} is {timing}. Completing this will free up time later.",
      "{task} is {timing}. Efficient and organised, as always.",
      "{task} is {timing}. Thank you for keeping things in order.",
      "{task} is {timing}. A short focused effort is sufficient."
    ],
    selfCare: [
      "{task} is scheduled {timing}. Rest is a priority.",
      "{task} is {timing}. Please keep this time protected.",
      "{task} is {timing}. Your wellbeing matters.",
      "{task} is {timing}. Taking time to recharge is important.",
      "{task} is {timing}. You have earned this break.",
      "{task} is {timing}. Rest supports everything else on your plan."
    ],
    focus: [
      "{task} is scheduled {timing}. You are well prepared.",
      "{task} is {timing}. Please review any details beforehand.",
      "{task} is {timing}. A clear plan leads to a good outcome.",
      "{task} is {timing}. You have the skills to handle this.",
      "{task} is {timing}. Allow a little extra time to prepare.",
      "{task} is {timing}. Best of luck. You've got this."
    ],
    encouragement: {
      high: [
        "You've got this.",
        "Make the most of today.",
        "You are well prepared.",
        "Wishing you a productive day.",
        "Excellent progress so far.",
        "I know you can do it."
      ],
      normal: [
        "You've got this.",
        "You're on track.",
        "Keep up the good work.",
        "One step at a time.",
        "I know you can do it.",
        "Your consistency is paying off."
      ],
      tired: [
        "Please pace yourself today.",
        "Doing what you can is enough.",
        "Remember to take breaks.",
        "Steady progress is still progress.",
        "Be patient with yourself today.",
        "You are still doing well."
      ],
      survival: [
        "Focus on the essentials today.",
        "Please prioritise rest where you can.",
        "Getting through today is enough.",
        "Be kind to yourself.",
        "One task at a time is sufficient.",
        "Your wellbeing comes first."
      ]
    }
  },
  chaos: {
    titles: ["Hype alarm", "Legend alert", "You've got this", "Main character", "Plot twist", "Big energy"],
    general: [
      "{task} is {timing}. You're literally unstoppable. Mostly.",
      "{task} is {timing}. Hype squad says: YOU'VE GOT THIS.",
      "BREAKING NEWS: {task} is {timing} and you're going to ace it.",
      "{task} is {timing}. Legends do the thing. You are a legend.",
      "{task} is {timing}. Chaos is optional. Greatness is not.",
      "{task} is {timing}. The vibes are immaculate. Go.",
      "{task} is {timing}. Your future self is screaming with pride.",
      "{task} is {timing}. Side quest accepted. XP incoming.",
      "{task} is {timing}. Absolutely iconic of you to have a plan.",
      "{task} is {timing}. Do it scared, do it tired, just start.",
      "{task} is {timing}. I believe in you more than I believe in coffee.",
      "{task} is {timing}. Main character arc: activated."
    ],
    work: [
      "Work is {timing}. Grab {prep} and go be iconic.",
      "Work is {timing}. Shift boss mode: ON.",
      "Work is {timing}. You run that place, honestly.",
      "Work is {timing}. Coffee, confidence, chaos-free. Go.",
      "Work is {timing}. Bag packed? Legend. Not yet? Speed run.",
      "Work is {timing}. Out there earning like a queen."
    ],
    gym: [
      "Gym is {timing}. Time to be terrifyingly strong.",
      "Gym is {timing}. {prep}. Then become a menace (healthily).",
      "Gym is {timing}. The weights miss you.",
      "Gym is {timing}. Sweat now, glow later.",
      "Gym is {timing}. Villain origin story, but make it fitness.",
      "Gym is {timing}. Shoes on and you've already won."
    ],
    chores: [
      "{task} is {timing}. Speed run it. Set a timer. Go.",
      "{task} is {timing}. Clean space, clear brain, big win.",
      "{task} is {timing}. Future you will literally cry with joy.",
      "{task} is {timing}. Boss battle: household edition.",
      "{task} is {timing}. Put on the loud playlist. Begin.",
      "{task} is {timing}. Tiny chaos goblin, huge results."
    ],
    selfCare: [
      "{task} is {timing}. Mandatory soft-girl hours.",
      "{task} is {timing}. Rest is a power move.",
      "{task} is {timing}. Recharge sequence initiated.",
      "{task} is {timing}. Go be gloriously lazy for a bit.",
      "{task} is {timing}. Your nervous system sent a thank-you card.",
      "{task} is {timing}. Self-care: elite behaviour."
    ],
    focus: [
      "{task} is {timing}. Brain on. You're a genius, act like it.",
      "{task} is {timing}. No spiralling, just slaying.",
      "{task} is {timing}. You prepped. You're ready. Go.",
      "{task} is {timing}. Big brain time. You've got this.",
      "{task} is {timing}. Calm chaos, sharp focus.",
      "{task} is {timing}. Deep breath. Absolutely smash it."
    ],
    encouragement: {
      high: [
        "YOU'VE GOT THIS!",
        "Unstoppable energy today.",
        "Go absolutely smash it.",
        "Legend behaviour only.",
        "I KNOW you can do it.",
        "Today is yours. Take it."
      ],
      normal: [
        "You've got this, legend.",
        "I know you can do it.",
        "Iconic behaviour.",
        "Proud of you, chaos goblin.",
        "Tiny steps, big wins.",
        "Go be brilliant."
      ],
      tired: [
        "Low battery mode is fine. You've still got this.",
        "Tired legend still a legend.",
        "Half effort still counts. Promise.",
        "Gentle chaos only today.",
        "Do one bit, then nap like royalty.",
        "Even sleepy you is impressive."
      ],
      survival: [
        "Survival mode: just the essentials. You're doing great.",
        "Getting through today is a whole win.",
        "Minimum effort, maximum self-respect.",
        "You're still here, still trying. Iconic.",
        "Be extra soft with yourself today.",
        "One tiny thing. Then snacks and rest."
      ]
    }
  }
};
