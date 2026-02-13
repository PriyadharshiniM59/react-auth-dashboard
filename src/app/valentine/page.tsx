import { Metadata } from 'next';
import ValentineClient from './ValentineClient';

export const metadata: Metadata = {
    title: 'A Special Message',
    description: 'A private surprise message.',
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

export default function ValentinePage() {
    return <ValentineClient />;
}
