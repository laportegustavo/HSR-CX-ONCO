import { createPatientAction, getPatientsAction as getPatients, deletePatientAction } from '../src/app/actions';
import { addTeamAction, addSystemAction, getConfig } from '../src/app/config-actions';
import { saveStaffAction, getStaff } from '../src/app/staff-actions';

async function runTests() {
    console.log("=== INICIANDO TESTE EXTENSIVO ===");

    // 1. Testar Ações de Configuração
    console.log("\n[1] Testando Configurações (Sistemas e Equipes)...");
    const initConfig = await getConfig();
    console.log(`Sistemas iniciais: ${initConfig.systems.length}, Equipes: ${initConfig.teams.length}`);
    
    await addSystemAction("SISTEMA_TESTE_AUTO");
    await addTeamAction("EQUIPE_TESTE_AUTO");
    
    const midConfig = await getConfig();
    if(midConfig.systems.includes("SISTEMA_TESTE_AUTO") && midConfig.teams.includes("EQUIPE_TESTE_AUTO")) {
        console.log("✅ Criado SISTEMA_TESTE_AUTO e EQUIPE_TESTE_AUTO com sucesso.");
    } else {
        console.error("❌ Falha ao criar sistema ou equipe.");
    }

    // 2. Testar Ações de Usuários (Staff)
    console.log("\n[2] Testando Usuários...");
    const initStaff = await getStaff();
    console.log(`Usuários iniciais: ${initStaff.length}`);

    await saveStaffAction({
        id: "",
        fullName: "Usuario Teste Automatizado",
        crm: "12345",
        type: "preceptor",
        username: "testepreceptor",
        password: "123",
        systemName: "EQUIPE_TESTE_AUTO"
    });

    const newStaff = await getStaff();
    const createdUser = newStaff.find(u => u.username === "testepreceptor");
    if(createdUser) {
        console.log("✅ Usuário preceptor criado e salvo no JSON: " + createdUser.fullName);
    } else {
        console.error("❌ Falha ao criar usuário.");
    }

    // 3. Testar Sincronização de Pacientes com CSV
    console.log("\n[3] Testando Criação de Paciente Sincronizada...");
    const initialPatients = await getPatients();
    console.log(`Pacientes iniciais no CSV: ${initialPatients.length}`);

    const res = await createPatientAction({
        name: "PACIENTE TESTE AUTOMATICO 001",
        cpf: "000.000.000-00",
        medicalRecord: "999999",
        aihDate: "2026-12-31",
        surgeryDate: "2027-01-01",
        team: "EQUIPE_TESTE_AUTO",
        preceptor: "Usuario Teste Automatizado",
        resident: "N/A",
        sistema: "SISTEMA_TESTE_AUTO",
        clinicalData: "TESTE DE SINCRONIZAÇÃO VIA CSV.",
        caseDiscussion: "",
        contactPhone: "999999999",
        preAnestheticEval: "Pendente",
        status: "AGENDADOS",
        priority: "1",
        age: "50",
        needsICU: "Não",
        latexAllergy: "Não",
        jehovahsWitness: "Não"
    });

    if (res.success && res.patient) {
        console.log("✅ Paciente criado via action. ID retornado: " + res.patient.id);
        
        // Verificar no arquivo base CSV
        const finalPatients = await getPatients();
        const found = finalPatients.find(p => p.name === "PACIENTE TESTE AUTOMATICO 001");
        if(found) {
            console.log("✅ SUCESSO TOTAL: Paciente localizado na requisição do CSV Base!");
            console.log(`Nome: ${found.name} | URL/Arquivo: /Users/macbookprolaporte/Desktop/CX ONCO HSR/AIH PENDENTE/Folha 1-Tabela 1.csv`);
        } else {
            console.error("❌ Falha: Paciente criado retornou sucesso mas não está no CSV lido.");
        }
        
        // Opcional: deletar o teste para não poluir
        console.log("\n[4] Limpando dados de teste do CSV...");
        await deletePatientAction(res.patient.id);
        const finalCheck = await getPatients();
        if(!finalCheck.find(p => p.name === "PACIENTE TESTE AUTOMATICO 001")) {
             console.log("✅ Paciente de teste removido do CSV com sucesso.");
        }
        
    } else {
        console.error("❌ Falha ao tentar criar paciente.");
    }

    console.log("\n=== TESTES CONCLUIDOS ===");
}

runTests().catch(console.error);
