import { Metadata } from 'next';
import CodingChallengeClient from './CodingChallengeClient';

export const metadata: Metadata = {
    title: 'Coding Challenge',
    robots: 'noindex, nofollow',
};

export default function CodingChallengePage() {
    return <CodingChallengeClient />;
}
