'use client';

import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.back()}
        sx={{ mb: 3, color: 'text.secondary' }}
      >
        뒤로가기
      </Button>

      <Paper sx={{ p: { xs: 3, md: 5 }, border: '1px solid', borderColor: 'gray2', boxShadow: 'none' }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          개인정보처리방침
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          시행일: 2026년 3월 27일
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
          주식트래커(이하 &quot;서비스&quot;)는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고,
          이와 관련한 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </Typography>

        {/* 1. 수집하는 개인정보 */}
        <Section number={1} title="수집하는 개인정보 항목">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.8 }}>
            서비스는 회원가입 및 서비스 이용을 위해 아래와 같은 개인정보를 수집합니다.
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>수집 항목</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>수집 방법</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>보관 방식</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>이메일 주소</TableCell>
                  <TableCell>Google / Kakao 소셜 로그인 시 자동 수집</TableCell>
                  <TableCell>AES-256-GCM 암호화 저장</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>서비스 이용 기록</TableCell>
                  <TableCell>Google Analytics를 통한 자동 수집</TableCell>
                  <TableCell>Google 서버에 익명화 저장</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>쿠키(세션 정보)</TableCell>
                  <TableCell>로그인 시 자동 생성</TableCell>
                  <TableCell>브라우저에 저장, 세션 만료 시 삭제</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.8 }}>
            ※ 서비스는 비밀번호를 별도로 수집하지 않으며, 소셜 로그인(OAuth 2.0 PKCE)을 통해 인증합니다.
          </Typography>
        </Section>

        {/* 2. 수집 목적 */}
        <Section number={2} title="개인정보의 수집 및 이용 목적">
          <BulletList items={[
            '회원 식별 및 로그인 인증',
            '투자 기록(포트폴리오, 주식 모으기, 적립식 매수) 저장 및 조회',
            '서비스 이용 통계 분석 및 개선',
          ]} />
        </Section>

        {/* 3. 보유 기간 */}
        <Section number={3} title="개인정보의 보유 및 이용 기간">
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            이용자의 개인정보는 <strong>회원 탈퇴 시 즉시 파기</strong>합니다.
            회원 탈퇴 시 소셜 로그인 연동 해제, 투자 기록, 사용자 정보가 모두 삭제되며 복구할 수 없습니다.
          </Typography>
        </Section>

        {/* 4. 제3자 제공 */}
        <Section number={4} title="개인정보의 제3자 제공">
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다.
            다만, 아래의 경우에는 예외로 합니다.
          </Typography>
          <BulletList items={[
            '이용자가 사전에 동의한 경우',
            '법령에 의해 요구되는 경우',
          ]} />
        </Section>

        {/* 5. 위탁 */}
        <Section number={5} title="개인정보 처리 위탁">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>위탁 업체</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>위탁 업무</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Supabase Inc.</TableCell>
                  <TableCell>인증 및 데이터베이스 호스팅</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Google LLC</TableCell>
                  <TableCell>소셜 로그인(Google OAuth), 서비스 이용 통계(Google Analytics)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Kakao Corp.</TableCell>
                  <TableCell>소셜 로그인(Kakao OAuth)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Vercel Inc.</TableCell>
                  <TableCell>웹 애플리케이션 호스팅</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Section>

        {/* 6. 이용자 권리 */}
        <Section number={6} title="이용자의 권리 및 행사 방법">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
            이용자는 언제든지 다음의 권리를 행사할 수 있습니다.
          </Typography>
          <BulletList items={[
            '회원 탈퇴: 서비스 내 사이드 메뉴 → 회원 탈퇴 버튼을 통해 즉시 처리',
            '소셜 로그인 연동 해제: 회원 탈퇴 시 Google/Kakao 연동이 자동으로 해제됩니다',
            '개인정보 열람·정정·삭제 요청: 아래 연락처로 문의',
          ]} />
        </Section>

        {/* 7. 안전성 확보 조치 */}
        <Section number={7} title="개인정보의 안전성 확보 조치">
          <BulletList items={[
            '이메일 주소는 AES-256-GCM 알고리즘으로 암호화하여 저장합니다',
            'DB 조회 시에는 HMAC-SHA256 해시값을 사용하여 원본 이메일이 노출되지 않도록 합니다',
            '서비스와 데이터베이스 간 통신은 TLS(HTTPS)로 암호화됩니다',
            '소셜 로그인은 OAuth 2.0 PKCE 방식을 사용하여 인증 코드 탈취를 방지합니다',
          ]} />
        </Section>

        {/* 8. 쿠키 */}
        <Section number={8} title="쿠키의 사용">
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            서비스는 로그인 세션 유지를 위해 필수 쿠키를 사용합니다.
            또한 Google Analytics가 서비스 이용 통계 수집을 위해 쿠키를 사용할 수 있습니다.
            이용자는 브라우저 설정을 통해 쿠키를 거부할 수 있으나, 이 경우 로그인이 정상적으로 동작하지 않을 수 있습니다.
          </Typography>
        </Section>

        {/* 9. 연락처 */}
        <Section number={9} title="개인정보 보호 관련 문의">
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            개인정보 처리에 관한 문의사항은 아래로 연락해주세요.
          </Typography>
          <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              서비스명: 주식트래커 (stocktracker.co.kr)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              이메일: lkh890111@gmail.com
            </Typography>
          </Box>
        </Section>
      </Paper>
    </Container>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        {number}. {title}
      </Typography>
      {children}
    </Box>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
      {items.map((item, i) => (
        <Typography key={i} component="li" variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
          {item}
        </Typography>
      ))}
    </Box>
  );
}
