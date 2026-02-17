import { Metadata } from 'next';
import ValentineClient2 from './ValentineClient2';

export const metadata: Metadata = {
    title: 'A Special Message v2',
    description: 'A private surprise message - Part 2.',
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
};

export default function ValentinePage2() {
    return <ValentineClient2 />;
}
