import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components';
import React from 'react';

export interface WelcomeEmailProps {
  businessName: string;
  businessType: string;
  dashboardUrl: string;
}

export const WelcomeEmail = ({
  businessName = 'Grand Budapest Hotel',
  businessType = 'Hotel',
  dashboardUrl = 'https://triplooper.com/admin/login',
}: WelcomeEmailProps) => {
  const previewText = `Your property ${businessName} is now live on Triplooper.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>TRIPLOOPER</Text>
          </Section>

          {/* Inner Card */}
          <Section style={card}>
            {/* Hero Section */}
            <Heading style={h1}>Your Hotel is Now Live</Heading>
            <Text style={subtext}>
              <strong style={{ color: '#111' }}>{businessName}</strong> is fully set up and ready to manage bookings, pricing, and operations.
            </Text>

            <Img
              src="https://dummyimage.com/600x320/000/fff&text=Triplooper+Dashboard"
              alt="Triplooper Dashboard"
              style={heroImage}
              width="100%"
              height="auto"
            />

            {/* Property Card */}
            <Section style={propertyCard}>
              <Row>
                <Column>
                  <Text style={propertyName}>{businessName}</Text>
                  <Text style={propertyType}>{businessType}</Text>
                </Column>
                <Column align="right">
                  <div style={statusBadge}>Confirmed</div>
                </Column>
              </Row>
            </Section>

            {/* Founder Note */}
            <Section style={founderNote}>
              <Text style={founderText}>Hi {businessName} team,</Text>
              <Text style={founderText}>
                I'm Rathnavel, founder of Triplooper.
              </Text>
              <Text style={founderText}>
                We built this platform for properties like yours — simple, powerful, and designed to grow with you.
              </Text>
              <Text style={founderText}>
                You're not just a customer, you're part of our journey.
              </Text>
              <Text style={{ ...founderText, marginBottom: '24px' }}>
                Reply anytime — I read every message.
              </Text>
              
              <Row>
                <Column style={{ width: '48px', paddingRight: '12px' }}>
                  <div style={avatar}>RK</div>
                </Column>
                <Column>
                  <Text style={founderName}>Rathnavel Karthi</Text>
                  <Text style={founderTitle}>Founder, Triplooper</Text>
                </Column>
              </Row>
            </Section>

            {/* CTA Button */}
            <Section style={ctaContainer}>
              <Button href={dashboardUrl} style={button}>
                Go to Your Dashboard &rarr;
              </Button>
            </Section>

          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Set up rooms, configure pricing, and go live — all in under 15 minutes.
            </Text>
            <Text style={footerCopyright}>
              &copy; {new Date().getFullYear()} Triplooper &middot; Premium Management
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

// --- Styles ---

const main = {
  backgroundColor: '#f5f5f5',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  padding: '40px 0',
};

const container = {
  margin: '0 auto',
  maxWidth: '600px',
  width: '100%',
};

const header = {
  padding: '0 0 24px',
  textAlign: 'center' as const,
};

const logo = {
  fontSize: '22px',
  fontWeight: '300',
  letterSpacing: '4px',
  color: '#111',
  margin: '0',
  lineHeight: '1',
};

const card = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e5e5e5',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  padding: '40px 32px',
};

const h1 = {
  color: '#111',
  fontSize: '26px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 12px',
  textAlign: 'center' as const,
  letterSpacing: '-0.5px',
};

const subtext = {
  color: '#666',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0 0 32px',
  textAlign: 'center' as const,
};

const heroImage = {
  borderRadius: '10px',
  border: '1px solid #e5e5e5',
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
  display: 'block',
  margin: '0 auto 32px',
};

const propertyCard = {
  backgroundColor: '#fafafa',
  border: '1px solid #e5e5e5',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '40px',
};

const propertyName = {
  margin: '0 0 4px',
  fontSize: '16px',
  fontWeight: '600',
  color: '#111',
};

const propertyType = {
  margin: '0',
  fontSize: '14px',
  color: '#666',
  textTransform: 'capitalize' as const,
};

const statusBadge = {
  backgroundColor: '#111',
  color: '#fff',
  fontSize: '11px',
  fontWeight: '500',
  padding: '6px 12px',
  borderRadius: '16px',
  display: 'inline-block',
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
};

const founderNote = {
  backgroundColor: '#fff7ed',
  borderRadius: '12px',
  border: '1px solid #ffedd5',
  padding: '32px',
  marginBottom: '40px',
};

const founderText = {
  margin: '0 0 16px',
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#000',
};

const avatar = {
  backgroundColor: '#111',
  color: '#fff',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  textAlign: 'center' as const,
  lineHeight: '40px',
  fontSize: '14px',
  fontWeight: '600',
};

const founderName = {
  margin: '0 0 4px',
  fontSize: '15px',
  fontWeight: '600',
  color: '#111',
};

const founderTitle = {
  margin: '0',
  fontSize: '13px',
  color: '#666',
};

const ctaContainer = {
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#000',
  borderRadius: '8px',
  color: '#fff',
  display: 'block',
  fontSize: '15px',
  fontWeight: '500',
  padding: '16px 24px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  width: '100%',
  boxSizing: 'border-box' as const,
};

const footer = {
  padding: '32px 20px 0',
  textAlign: 'center' as const,
};

const footerText = {
  margin: '0 0 12px',
  color: '#666',
  fontSize: '13px',
  lineHeight: '1.5',
};

const footerCopyright = {
  margin: '0',
  color: '#999',
  fontSize: '12px',
  letterSpacing: '0.5px',
};
