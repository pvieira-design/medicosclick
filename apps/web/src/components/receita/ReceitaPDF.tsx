import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#000000',
  },
  headerBox: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 10,
    marginBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  infoBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000000',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  doctorBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000000',
    padding: 10,
  },
  doctorName: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  doctorInfo: {
    fontSize: 10,
  },
  patientBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000000',
    padding: 10,
  },
  patientText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  patientInfo: {
    fontSize: 10,
    marginTop: 2,
  },
  contentBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000000',
    padding: 20,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  productContainer: {
    marginBottom: 15,
  },
  productLine: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  posologia: {
    fontSize: 10,
    marginLeft: 15,
    lineHeight: 1.4,
  },
  footerBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000000',
    padding: 10,
    marginTop: 0,
  },
  signatureContainer: {
    flexDirection: 'row',
    marginTop: 15,
    alignItems: 'flex-start',
  },
  badgeContainer: {
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
    padding: 8,
    width: 140,
    flexDirection: 'column',
  },
  badgeHeader: {
    fontSize: 6,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  badgeTitle: {
    fontSize: 10,
    color: '#5bc0de',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  badgeDivider: {
    height: 1,
    backgroundColor: '#ffffff',
    opacity: 0.3,
    marginVertical: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeLogoSection: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 8,
  },
  badgeLogoText: {
    fontSize: 7,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  badgeLogoSubtext: {
    fontSize: 5,
    color: '#ffffff',
  },
  badgeLegalSection: {
    flex: 1,
  },
  badgeLegalText: {
    fontSize: 5,
    color: '#ffffff',
    lineHeight: 1.3,
  },
  badgeLegalBold: {
    fontSize: 6,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  verificationTextContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
   verificationLine: {
     fontSize: 7,
     color: '#000000',
     marginBottom: 3,
     lineHeight: 1.5,
   },
   verificationLineBold: {
     fontSize: 7,
     color: '#000000',
     fontWeight: 'bold',
     marginBottom: 3,
   },
   verificationUrl: {
     fontSize: 6,
     color: '#0066cc',
     marginTop: 2,
     marginBottom: 1,
   },
  qrSection: {
    alignItems: 'center',
    width: 70,
  },
  qrCode: {
    width: 60,
    height: 60,
  },
   serialCode: {
     fontSize: 6,
     fontFamily: 'Courier',
     marginTop: 4,
     textAlign: 'center',
     color: '#000000',
     backgroundColor: '#ffffff',
   },
});

export interface ReceitaData {
  medico: {
    nome: string;
    crm: string;
    uf: string;
    endereco: string;
  };
  paciente: {
    nome: string;
    cpf?: string;
  };
  produtos: Array<{
    nome: string;
    concentracao: string;
    quantidade: number;
    posologia: string;
  }>;
  dataEmissao: Date;
  assinatura?: {
    receitaId: string;
    dataAssinatura: Date;
    certificadoTitular: string;
    qrCodeDataUrl?: string;
  };
}

interface ReceitaPDFProps {
  data: ReceitaData;
}

function generateSerialCode(receitaId: string): string {
  const hash = receitaId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `CLK-${hash}`;
}

const ReceitaPDF: React.FC<ReceitaPDFProps> = ({ data }) => {
  const formattedDate = new Date(data.dataEmissao).toLocaleDateString('pt-BR');
  const assinaturaDate = data.assinatura?.dataAssinatura 
    ? new Date(data.assinatura.dataAssinatura).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const serialCode = data.assinatura?.receitaId 
    ? generateSerialCode(data.assinatura.receitaId)
    : null;
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle}>RELATÓRIO MÉDICO</Text>
        </View>

        <View style={styles.infoBox}>
          <View>
            <Text>TELECONSULTA</Text>
            <Text style={{ marginTop: 4 }}>Endereço: {data.medico.endereco}</Text>
          </View>
          <Text>{formattedDate}</Text>
        </View>

        <View style={styles.doctorBox}>
          <Text style={styles.doctorName}>Dr. {data.medico.nome}</Text>
          <Text style={styles.doctorInfo}>CRM: {data.medico.crm} - {data.medico.uf}</Text>
        </View>

        <View style={styles.patientBox}>
          <Text style={styles.patientText}>Paciente: {data.paciente.nome}</Text>
          {data.paciente.cpf && (
            <Text style={styles.patientInfo}>CPF: {data.paciente.cpf}</Text>
          )}
        </View>

        <View style={styles.contentBox}>
          <Text style={styles.sectionTitle}>USO INTERNO, INDIVIDUAL E CONTÍNUO</Text>

          {data.produtos.map((prod, index) => (
            <View key={index} style={styles.productContainer}>
              <Text style={styles.productLine}>
                {index + 1} - {prod.nome} - {prod.concentracao} ({prod.quantidade} {prod.quantidade === 1 ? 'unidade' : 'unidades'})
              </Text>
              <Text style={styles.posologia}>
                {prod.posologia}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footerBox}>
          {data.assinatura && (
            <View style={styles.signatureContainer}>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeHeader}>ASSINATURA ELETRÔNICA</Text>
                <Text style={styles.badgeTitle}>QUALIFICADA</Text>
                <View style={styles.badgeDivider} />
                <View style={styles.badgeRow}>
                  <View style={styles.badgeLogoSection}>
                    <Text style={styles.badgeLogoText}>ICP</Text>
                    <Text style={styles.badgeLogoSubtext}>Brasil</Text>
                  </View>
                  <View style={styles.badgeLegalSection}>
                    <Text style={styles.badgeLegalText}>Conforme</Text>
                     <Text style={styles.badgeLegalBold}>MP 2.200-2/2001</Text>
                    <Text style={styles.badgeLegalText}>e Lei 14.063/20</Text>
                  </View>
                </View>
              </View>

              <View style={styles.verificationTextContainer}>
                <Text style={styles.verificationLineBold}>
                  Assinado por: {data.assinatura.certificadoTitular}
                </Text>
                <Text style={styles.verificationLine}>
                  Data/Hora: {assinaturaDate}
                </Text>
                <Text style={styles.verificationLine}>
                  MP nº 2.200-2/2001 - ICP-Brasil
                </Text>
                <Text style={styles.verificationLine}>
                  Resoluções CFM nº 2.299/2021 e 2.381/2024
                </Text>
                 <Text style={styles.verificationUrl}>
                   Validar assinatura: validar.iti.gov.br
                 </Text>
                 <Text style={styles.verificationUrl}>
                   Verificar receita: clickmedicos.com.br/verificar/{data.assinatura.receitaId}
                 </Text>
              </View>

              {data.assinatura.qrCodeDataUrl && (
                <View style={styles.qrSection}>
                  <Image style={styles.qrCode} src={data.assinatura.qrCodeDataUrl} />
                  <Text style={styles.serialCode}>{serialCode}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://clickmedicos.com.br';
}

async function gerarQRCode(receitaId: string): Promise<string> {
  const baseUrl = getBaseUrl();
  const verificationUrl = `${baseUrl}/verificar/${receitaId}`;
  return await QRCode.toDataURL(verificationUrl, {
    width: 150,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

export const gerarReceitaPdfBase64 = async (dados: ReceitaData): Promise<string> => {
  try {
    let dadosComQR = dados;
    
    if (dados.assinatura?.receitaId) {
      const qrCodeDataUrl = await gerarQRCode(dados.assinatura.receitaId);
      dadosComQR = {
        ...dados,
        assinatura: {
          ...dados.assinatura,
          qrCodeDataUrl,
        },
      };
    }
    
    const blob = await pdf(<ReceitaPDF data={dadosComQR} />).toBlob();
    
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Clean = result.split(',')[1];
        resolve(base64Clean);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const sizeInBytes = Buffer.byteLength(base64, 'base64');
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > 7) {
      throw new Error(`PDF size (${sizeInMB.toFixed(2)}MB) exceeds the 7MB limit.`);
    }

    return base64;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export default ReceitaPDF;
