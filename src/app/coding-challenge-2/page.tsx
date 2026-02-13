import { Metadata } from 'next';
import CodingChallengeClient2 from './CodingChallengeClient2';

export const metadata: Metadata = {
    title: 'Coding Challenge - Part 2',
    robots: 'noindex, nofollow',
};

export default function CodingChallengePage2() {
    return <CodingChallengeClient2 />;
}
