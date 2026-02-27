export interface CareerMilestone {
    startYear: number;
    endYear: number | null; // null means "Present"
    label: string;
    badge: string;
    description: string;
}

export const authorMilestones: CareerMilestone[] = [
    {
        startYear: 1990,
        endYear: 2009,
        label: "電商探險家",
        badge: "🚀",
        description: "當時深耕電子商務產業，歷任新浪網、PChome、eBay 代表性職務。"
    },
    {
        startYear: 2010,
        endYear: 2017,
        label: "金融轉型者",
        badge: "🏦",
        description: "當時正主導永豐銀行數位轉型，擔任電子金融處處長與永豐創投董事。"
    },
    {
        startYear: 2018,
        endYear: 2021,
        label: "純網銀創業人",
        badge: "🦄",
        description: "當時正投入台灣首批純網銀「將來銀行」的籌設與營運。"
    },
    {
        startYear: 2022,
        endYear: 2024,
        label: "支付領航者",
        badge: "💳",
        description: "當時正領導台灣最大電支平台「街口支付」，深度參與數位金融法規。"
    },
    {
        startYear: 2025,
        endYear: null,
        label: "國際金融對接",
        badge: "🍏",
        description: "帶領街口支付對接國際巨頭 Apple，推動台灣金融科技國際化實踐。"
    }
];

export function getMilestoneByDate(date: Date): CareerMilestone | null {
    const year = date.getFullYear();
    return authorMilestones.find(m => {
        const startMatch = year >= m.startYear;
        const endMatch = m.endYear === null || year <= m.endYear;
        return startMatch && endMatch;
    }) || null;
}
