import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// This file is web-only and used to configure the root HTML for every page.
export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="es">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

                {/* 1. Standard SEO */}
                <title>Kitos - Escanea, Ordena y Paga.</title>
                <meta name="description" content="La forma más rápida de pedir en restaurantes. Escanea el código QR de tu mesa, ordena y paga sin esperas. También llevamos tu comida a domicilio." />
                <meta name="keywords" content="restaurantes, menu digital, qr, ordenar, pagar, delivery, mexico, comida" />

                {/* 2. Open Graph / Facebook / WhatsApp */}
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Kitos - Escanea, Ordena y Paga." />
                <meta property="og:description" content="La forma más rápida de pedir en restaurantes. Escanea el código QR de tu mesa, ordena y paga sin esperas." />
                <meta property="og:image" content="https://kitos.app/social-preview.png" />
                <meta property="og:url" content="https://kitos.app" />
                <meta property="og:site_name" content="Kitos" />

                {/* 3. Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Kitos - Escanea, Ordena y Paga." />
                <meta name="twitter:description" content="Pide desde tu mesa de forma rápida y segura." />
                <meta name="twitter:image" content="https://kitos.app/social-preview.png" />

                {/* 4. PWA / Mobile Web */}
                <meta name="theme-color" content="#F97316" />
                <link rel="icon" type="image/png" href="/favicon.png" />

                {/* Expo Reset Styles */}
                <ScrollViewStyleReset />
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}
