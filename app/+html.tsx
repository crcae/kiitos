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
                <title>Kitos - Tu comida favorita, al instante.</title>
                <meta name="description" content="Pide de los mejores restaurantes locales en minutos. Kitos es la app de delivery más rápida de México." />
                <meta name="keywords" content="delivery, comida, mexico, restaurantes, tacos, pizza, servicio a domicilio, kitos" />

                {/* 2. Open Graph / Facebook / WhatsApp */}
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Kitos - Tu comida favorita, al instante." />
                <meta property="og:description" content="Descubre los mejores restaurantes locales and recibe tu pedido en minutos. Descarga la app hoy." />
                <meta property="og:image" content="https://kitos.app/social-preview.png" />
                <meta property="og:url" content="https://kitos.app" />
                <meta property="og:site_name" content="Kitos" />

                {/* 3. Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Kitos - Delivery Local" />
                <meta name="twitter:description" content="Tu comida favorita en la puerta de tu casa." />
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
