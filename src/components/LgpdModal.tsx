"use client";

import { useState, useRef, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

interface LgpdModalProps {
    userName: string;
    onAccept: () => void;
}

export default function LgpdModal({ userName, onAccept }: LgpdModalProps) {
    const [scrolledToBottom, setScrolledToBottom] = useState(false);
    const [checked, setChecked] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (contentRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
            // Add a 5px buffer
            if (scrollTop + clientHeight >= scrollHeight - 5) {
                setScrolledToBottom(true);
            }
        }
    };

    useEffect(() => {
        const checkInitialScroll = () => {
            if (contentRef.current) {
                const { scrollHeight, clientHeight } = contentRef.current;
                if (scrollHeight <= clientHeight + 5) {
                    setScrolledToBottom(true);
                }
            }
        };
        checkInitialScroll();
    }, []);

    const handleAcceptClick = async () => {
        setIsSubmitting(true);
        await onAccept();
        // Assume parent handles unmount immediately
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">Termo de Adequação à LGPD</h2>
                        <p className="text-xs sm:text-sm font-bold text-slate-500">Sr(a). {userName}, leia atentamente até o final para prosseguir</p>
                    </div>
                </div>

                <div 
                    ref={contentRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-5 sm:p-8 text-sm text-slate-700 space-y-4 font-medium leading-relaxed"
                >
                    <div className="text-center font-black text-slate-900 mb-6 uppercase">
                        TERMO DE ADEQUAÇÃO À LEI GERAL DE PROTEÇÃO DE DADOS (LGPD)<br/>
                        BANCO DE DADOS – FILA DE CIRURGIA SUS<br/>
                        SERVIÇO DE CIRURGIA ONCOLÓGICA<br/>
                        SANTA CASA DE MISERICÓRDIA DE PORTO ALEGRE
                    </div>

                    <h3 className="font-bold text-slate-800">1. IDENTIFICAÇÃO DO CONTROLADOR</h3>
                    <p><strong>Controlador:</strong> Santa Casa de Misericórdia de Porto Alegre<br/>
                    <strong>Setor responsável:</strong> Serviço de Cirurgia Oncológica<br/>
                    <strong>Finalidade institucional:</strong> Gestão da fila cirúrgica oncológica de pacientes do Sistema Único de Saúde (SUS), com organização, priorização e acompanhamento assistencial.</p>

                    <h3 className="font-bold text-slate-800 mt-6">2. FINALIDADE DO TRATAMENTO DE DADOS</h3>
                    <p>O tratamento de dados pessoais e dados pessoais sensíveis tem por finalidade exclusiva:</p>
                    <ul className="list-[lower-alpha] pl-5 space-y-1">
                        <li>Organização da fila cirúrgica oncológica SUS;</li>
                        <li>Priorização clínica baseada em critérios médicos e protocolos assistenciais;</li>
                        <li>Planejamento e execução de procedimentos cirúrgicos;</li>
                        <li>Comunicação assistencial entre equipe médica;</li>
                        <li>Cumprimento de obrigações legais e regulatórias no âmbito do SUS;</li>
                        <li>Ensino médico e formação de residentes, vinculados à assistência.</li>
                    </ul>

                    <h3 className="font-bold text-slate-800 mt-6">3. NATUREZA DOS DADOS TRATADOS</h3>
                    <p>Serão tratados os seguintes dados:</p>
                    <ul className="list-[lower-alpha] pl-5 space-y-1">
                        <li><strong>Dados pessoais:</strong> nome completo, data de nascimento, número do cartão SUS, CPF, telefone, endereço;</li>
                        <li><strong>Dados pessoais sensíveis:</strong> informações de saúde, diagnóstico oncológico (CID), estadiamento, exames, conduta terapêutica, evolução clínica;</li>
                        <li><strong>Dados administrativos:</strong> data de inclusão na fila, prioridade cirúrgica, status do procedimento.</li>
                    </ul>
                    <p>Os dados são classificados como dados pessoais sensíveis, nos termos do art. 5º, II, da LGPD.</p>

                    <h3 className="font-bold text-slate-800 mt-6">4. BASE LEGAL PARA TRATAMENTO</h3>
                    <p>O tratamento dos dados está fundamentado nas seguintes bases legais:</p>
                    <ul className="list-[lower-alpha] pl-5 space-y-1">
                        <li>Art. 7º, II – cumprimento de obrigação legal ou regulatória;</li>
                        <li>Art. 7º, III – execução de políticas públicas (SUS);</li>
                        <li>Art. 11, II, &quot;a&quot; – cumprimento de obrigação legal;</li>
                        <li>Art. 11, II, &quot;b&quot; – tratamento compartilhado necessário à execução de políticas públicas;</li>
                        <li>Art. 11, II, &quot;f&quot; – tutela da saúde, exclusivamente em procedimento realizado por profissionais de saúde e serviços de saúde.</li>
                    </ul>

                    <h3 className="font-bold text-slate-800 mt-6">5. ACESSO E CONTROLE DE USUÁRIOS</h3>
                    <p>O acesso ao banco de dados é restrito exclusivamente a:</p>
                    <ul className="list-[lower-alpha] pl-5 space-y-1">
                        <li>Médicos preceptores do Serviço de Cirurgia Oncológica;</li>
                        <li>Médicos residentes regularmente vinculados ao serviço.</li>
                    </ul>
                    <p className="mt-2 font-bold">Regras de acesso:</p>
                    <ul className="list-[upper-roman] pl-5 space-y-1">
                        <li>O acesso é individual, mediante login e senha pessoal e intransferível;</li>
                        <li>É vedado o compartilhamento de credenciais;</li>
                        <li>O acesso é limitado à finalidade assistencial, educacional e administrativa;</li>
                        <li>Todas as ações no sistema devem ser passíveis de rastreabilidade (logs de acesso).</li>
                    </ul>

                    <h3 className="font-bold text-slate-800 mt-6">6. MEDIDAS DE SEGURANÇA DA INFORMAÇÃO</h3>
                    <p>São adotadas medidas técnicas e administrativas aptas a proteger os dados pessoais:</p>
                    <ul className="list-[lower-alpha] pl-5 space-y-1">
                        <li>Controle de acesso restrito por perfil de usuário;</li>
                        <li>Registro de logs de acesso e manipulação de dados;</li>
                        <li>Armazenamento em ambiente seguro (servidores institucionais ou plataformas protegidas);</li>
                        <li>Criptografia ou pseudonimização quando aplicável;</li>
                        <li>Backup periódico e seguro;</li>
                        <li>Política de confidencialidade obrigatória para usuários autorizados.</li>
                    </ul>

                    <h3 className="font-bold text-slate-800 mt-6">7. CONFIDENCIALIDADE E SIGILO</h3>
                    <p>Todos os usuários com acesso ao banco de dados estão obrigados ao sigilo profissional e institucional, nos termos:</p>
                    <ul className="list-[lower-alpha] pl-5 space-y-1">
                        <li>Código de Ética Médica (Resolução CFM nº 2.217/2018);</li>
                        <li>LGPD (Lei nº 13.709/2018);</li>
                        <li>Normas internas da instituição.</li>
                    </ul>
                    <p className="mt-2 font-bold">É vedada:</p>
                    <ul className="list-[upper-roman] pl-5 space-y-1">
                        <li>Divulgação de dados fora do ambiente institucional;</li>
                        <li>Uso dos dados para fins pessoais ou não autorizados;</li>
                        <li>Compartilhamento com terceiros sem base legal.</li>
                    </ul>

                    <h3 className="font-bold text-slate-800 mt-6">8. COMPARTILHAMENTO DE DADOS</h3>
                    <p>O compartilhamento de dados poderá ocorrer exclusivamente:</p>
                    <ul className="list-[lower-alpha] pl-5 space-y-1">
                        <li>Entre profissionais de saúde envolvidos na assistência;</li>
                        <li>Com órgãos públicos de saúde (SUS), quando necessário;</li>
                        <li>Mediante requisição judicial ou obrigação legal.</li>
                    </ul>
                    <p>É vedado o compartilhamento com terceiros sem respaldo legal.</p>

                    <h3 className="font-bold text-slate-800 mt-6">9. TEMPO DE ARMAZENAMENTO</h3>
                    <p>Os dados serão armazenados pelo período necessário ao cumprimento das finalidades assistenciais, legais e regulatórias, observando:</p>
                    <ul className="list-[lower-alpha] pl-5 space-y-1">
                        <li>Normas do Ministério da Saúde;</li>
                        <li>Normas do Conselho Federal de Medicina;</li>
                        <li>Legislação aplicável a prontuários médicos.</li>
                    </ul>

                    <h3 className="font-bold text-slate-800 mt-6">10. DIREITOS DO TITULAR DOS DADOS</h3>
                    <p>São assegurados aos titulares dos dados:</p>
                    <ul className="list-[lower-alpha] pl-5 space-y-1">
                        <li>Confirmação da existência de tratamento;</li>
                        <li>Acesso aos dados;</li>
                        <li>Correção de dados incompletos ou desatualizados;</li>
                        <li>Anonimização, bloqueio ou eliminação, quando aplicável;</li>
                        <li>Informação sobre compartilhamento.</li>
                    </ul>
                    <p>Os direitos poderão ser exercidos nos termos da LGPD, respeitadas as limitações legais aplicáveis à área da saúde.</p>

                    <h3 className="font-bold text-slate-800 mt-6">11. RESPONSABILIDADES</h3>
                    <ul className="list-[lower-alpha] pl-5 space-y-1">
                        <li>A instituição, como controladora, é responsável pela governança dos dados;</li>
                        <li>Os médicos preceptores e residentes atuam como operadores, devendo cumprir integralmente as normas;</li>
                        <li>O uso indevido dos dados poderá implicar responsabilização civil, administrativa e ética.</li>
                    </ul>

                    <h3 className="font-bold text-slate-800 mt-6">12. DISPOSIÇÕES FINAIS</h3>
                    <p>Este termo aplica-se a todo o banco de dados da fila cirúrgica oncológica SUS do Serviço de Cirurgia Oncológica da Santa Casa de Porto Alegre.</p>
                    <p>O descumprimento das normas aqui estabelecidas poderá resultar em sanções disciplinares, sem prejuízo das responsabilidades legais cabíveis.</p>

                    <div className="mt-8 italic text-slate-600 font-bold border-l-4 border-slate-300 pl-4">
                        <p>Local e data: Porto Alegre, 21 de março de 2026.</p>
                        <p>Responsável pelo Serviço: Dr. Tiago Auatt Paes Remonti, CREMERS 27377.</p>
                        <p>Encarregado de Dados (DPO): Dr. Gustavo Andreazza Laporte, CREMERS 29176</p>
                    </div>
                </div>

                <div className="p-5 sm:p-6 border-t border-slate-200 bg-white shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                    <label 
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            !scrolledToBottom 
                                ? 'opacity-50 border-slate-100 bg-slate-50 cursor-not-allowed' 
                                : checked 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-slate-300 hover:border-blue-400 bg-white'
                        }`}
                    >
                        <div className="flex items-center h-6 mt-0.5">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                checked={checked}
                                disabled={!scrolledToBottom}
                                onChange={(e) => setChecked(e.target.checked)}
                            />
                        </div>
                        <div className="text-sm font-bold text-slate-700 leading-tight">
                            Declaro estar ciente de que o acesso ao banco de dados da fila cirúrgica do SUS do Serviço de Cirurgia Oncológica envolve dados pessoais e sensíveis, comprometendo-me a utilizá-los exclusivamente para fins assistenciais e institucionais, respeitando o sigilo profissional e a Lei nº 13.709/2018 (LGPD), sendo vedado qualquer compartilhamento não autorizado.
                        </div>
                    </label>

                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        {!scrolledToBottom && (
                            <p className="text-xs font-bold text-amber-600 flex-1 flex items-center bg-amber-50 px-3 py-2 rounded-lg">
                                * Role o documento acima até o final para habilitar a marcação.
                            </p>
                        )}
                        <button
                            onClick={handleAcceptClick}
                            disabled={!checked || isSubmitting}
                            title="Aceitar Termo LGPD e entrar no sistema"
                            className={`flex-1 sm:flex-none sm:ml-auto px-8 py-3 rounded-xl font-black uppercase text-sm transition-all ${
                                checked && !isSubmitting
                                    ? 'bg-[#0a1f44] text-white hover:bg-slate-800 shadow-lg active:scale-95' 
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {isSubmitting ? 'Registrando...' : 'Aceitar Termo e Entrar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
