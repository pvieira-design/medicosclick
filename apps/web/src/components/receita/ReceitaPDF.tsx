import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

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
  footerText: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 2,
  },
  signatureLine: {
    marginTop: 20,
    marginBottom: 5,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    width: '60%',
    alignSelf: 'center',
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
  };
  produtos: Array<{
    nome: string;
    concentracao: string;
    quantidade: number;
    posologia: string;
  }>;
  dataEmissao: Date;
}

interface ReceitaPDFProps {
  data: ReceitaData;
}

const ReceitaPDF: React.FC<ReceitaPDFProps> = ({ data }) => {
  const formattedDate = new Date(data.dataEmissao).toLocaleDateString('pt-BR');
  
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
        </View>

        <View style={styles.contentBox}>
          <Text style={styles.sectionTitle}>USO INTERNO, INDIVIDUAL E CONTÍNUO</Text>

          {data.produtos.map((prod, index) => (
            <View key={index} style={styles.productContainer}>
              <Text style={styles.productLine}>
                {index + 1} - {prod.nome} - {prod.concentracao} ({prod.quantidade})
              </Text>
              <Text style={styles.posologia}>
                {prod.posologia}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footerBox}>
          <Text style={styles.footerText}>Assinado digitalmente por Dr. {data.medico.nome}</Text>
          <Text style={styles.footerText}>Data: {formattedDate} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
          <Text style={styles.footerText}>MP nº 2.200-2/2001 - ICP-Brasil</Text>
          <Text style={styles.footerText}>Resolução CFM nº 2.299/2021</Text>
        </View>
      </Page>
    </Document>
  );
};

export const gerarReceitaPdfBase64 = async (dados: ReceitaData): Promise<string> => {
  try {
    const blob = await pdf(<ReceitaPDF data={dados} />).toBlob();
    
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
