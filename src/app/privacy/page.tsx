import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Aichi Rovers Conference",
  description:
    "Aichi Rovers Conference（愛知連盟ローバース会議）が運営する本サービスにおける個人情報の取扱いについて定めるプライバシーポリシーです。",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export const dynamic = "force-static"; // 変更頻度が低いため静的配信
export const revalidate = 86400; // 1日毎に再検証（任意）

const ORG_NAME = "Aichi Rovers Conference（愛知連盟ローバース会議）";
const CONTACT_EMAIL = "info@aichirovers.com"; // ←必要に応じて変更
const EFFECTIVE = "2025-08-26"; // 制定日
const UPDATED = "2025-08-26"; // 最終改定日

function Sec({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="mt-10 text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-3 text-[15px] leading-7 text-slate-800">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <p className="text-sm text-slate-500">制定日：{EFFECTIVE}／最終改定日：{UPDATED}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">プライバシーポリシー</h1>
        <p className="mt-3 text-[15px] leading-7 text-slate-800">
          {ORG_NAME}（以下「当会」）は、当会が運営するWebサイトおよび関連サービス（出席管理QR配布、メール配信、参加者管理ダッシュボード等。以下「本サービス」）における個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。
        </p>
      </header>

      {/* 目次 */}
      <nav aria-label="目次" className="mb-8">
  {/* モバイル：折りたたみ */}
  <details className="md:hidden rounded-xl border border-slate-200 bg-white p-4">
    <summary className="cursor-pointer list-none text-[15px] font-semibold text-slate-900">
      目次（主要項目）
    </summary>
    <ol className="mt-3 grid gap-2 text-[15px] text-slate-700 list-decimal list-inside">
      <li><a className="hover:underline" href="#operator">1. 事業者情報</a></li>
      <li><a className="hover:underline" href="#items">3. 取得する情報の項目</a></li>
      <li><a className="hover:underline" href="#purpose">5. 利用目的</a></li>
      <li><a className="hover:underline" href="#third">7. 第三者提供</a></li>
      <li><a className="hover:underline" href="#cookie">10. クッキー等の利用</a></li>
      <li><a className="hover:underline" href="#retention">11. 保管期間</a></li>
      <li><a className="hover:underline" href="#security">12. 安全管理措置</a></li>
      <li><a className="hover:underline" href="#disclosure">15. 開示等の請求</a></li>
      <li><a className="hover:underline" href="#publish">17. 公開・改定</a></li>
      <li><a className="hover:underline" href="#contact">18. 連絡先</a></li>
    </ol>
  </details>

  {/* デスクトップ：コンパクト2列、非Sticky */}
  <div className="hidden md:block rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-sm font-semibold text-slate-900">目次（主要項目）</p>
    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-[15px] text-slate-700">
      <a className="hover:underline" href="#operator">1. 事業者情報</a>
      <a className="hover:underline" href="#items">3. 取得する情報の項目</a>
      <a className="hover:underline" href="#purpose">5. 利用目的</a>
      <a className="hover:underline" href="#third">7. 第三者提供</a>
      <a className="hover:underline" href="#cookie">10. クッキー等の利用</a>
      <a className="hover:underline" href="#retention">11. 保管期間</a>
      <a className="hover:underline" href="#security">12. 安全管理措置</a>
      <a className="hover:underline" href="#disclosure">15. 開示等の請求</a>
      <a className="hover:underline" href="#publish">17. 公開・改定</a>
      <a className="hover:underline" href="#contact">18. 連絡先</a>
    </div>
  </div>
</nav>

      <Sec id="operator" title="1. 事業者情報">
        <ul className="list-disc pl-5">
          <li>名称：{ORG_NAME}</li>
          <li>
            連絡先：<a className="text-blue-700 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>（以下「お問い合わせ窓口」）
          </li>
        </ul>
      </Sec>

      <Sec id="scope" title="2. 適用範囲">
        <p>本ポリシーは、本サービスにおいて当会が取得・利用する個人情報およびそれに準ずる情報の取扱いに適用されます。</p>
      </Sec>

      <Sec id="items" title="3. 取得する情報の項目">
        <ul className="list-disc pl-5">
          <li>氏名</li>
          <li>メールアドレス（任意だが登録がある場合は固有に管理）</li>
          <li>所属団</li>
          <li>所属地区</li>
          <li>RS年齢（ローバースカウト年齢）</li>
          <li>出欠・受付情報（QRコード・受付時刻・参加回等）</li>
          <li>連絡配信履歴（送信先、送信日時、配信結果、エラーログ等）</li>
          <li>認証・本人確認用トークン（メールログイン用URLや一時トークン）</li>
          <li>サイト利用時の技術情報（IPアドレス、ブラウザ情報、Cookie等）</li>
        </ul>
      </Sec>

      <Sec id="how" title="4. 取得方法">
        <ul className="list-disc pl-5">
          <li>参加登録フォーム・一括登録（CSV/テキスト）入力により取得</li>
          <li>出席受付（QRコードの提示・読み取り）により取得</li>
          <li>連絡配信（メール）の運用上、配信結果・エラー情報を取得</li>
          <li>サイト利用時にセッション維持のためCookieを取得</li>
        </ul>
      </Sec>

      <Sec id="purpose" title="5. 利用目的">
        <ol className="list-decimal pl-5">
          <li>行事・定例会等の参加者管理、受付・出欠管理</li>
          <li>受付用QRコードや参加に関する連絡（メール配布・確認連絡等）の送付</li>
          <li>本人確認・不正防止（メールトークン・セッション管理等）</li>
          <li>連絡網の整備、緊急時の連絡、運営上の通知</li>
          <li>本サービスの運用・保守、品質向上、障害対応、セキュリティ対策</li>
          <li>統計・集計（個人を特定できない形での利用実績の把握）</li>
          <li>法令の遵守、または法令に基づく対応</li>
        </ol>
      </Sec>

      <Sec id="change" title="6. 利用目的の変更">
        <p>目的が変更された場合は、変更後の目的が合理的に関連性を有すると認められる範囲で行い、変更内容を本ポリシーの改定等により公表します。</p>
      </Sec>

      <Sec id="third" title="7. 第三者提供">
        <p>当会は、次の場合を除き、個人情報を第三者へ提供しません。</p>
        <ul className="mt-2 list-disc pl-5">
          <li>本人の同意がある場合</li>
          <li>法令に基づく場合</li>
          <li>人の生命、身体または財産の保護のために必要で、本人の同意取得が困難な場合</li>
          <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要で、本人の同意取得が困難な場合</li>
          <li>国の機関等の法令に定める事務への協力が必要な場合</li>
        </ul>
      </Sec>

      <Sec id="outsourcing" title="8. 委託（クラウド等の利用）">
        <p>当会は、メール送信、データベース、ホスティング、アクセス解析、運用保守等を、個人情報の取扱いに関する契約を締結した委託先（クラウド事業者等）に委託することがあります。この際、日本国内外のサーバーで情報が処理・保管されることがあります。</p>
      </Sec>

      <Sec id="joint" title="9. 共同利用">
        <p>現時点で共同利用（特定団体と共同でのデータベース利用）は行っていません。共同利用を開始する場合は、目的、範囲、管理責任者等を明示のうえ、事前に告知します。</p>
      </Sec>

      <Sec id="cookie" title="10. クッキー等の利用">
        <ul className="list-disc pl-5">
          <li>本サービスは、ログイン・セッション維持のためCookie（セッションクッキー等）を使用します。</li>
          <li>必要不可欠なCookieはオプトアウトできません。広告目的のCookieは使用しません。</li>
          <li>ブラウザ設定によりCookieの受け入れを制限することは可能ですが、機能が一部利用できなくなる場合があります。</li>
        </ul>
      </Sec>

      <Sec id="retention" title="11. 保管期間">
        <p>個人情報は、利用目的の達成に必要な期間、または法令上の保存義務がある期間保管し、不要となった情報は、合理的な期間内に安全な方法で消去・匿名化します。例：参加者アカウントの削除・退会、または最終利用から一定期間（例：2年間）経過後に削除等。</p>
      </Sec>

      <Sec id="security" title="12. 安全管理措置">
        <ul className="list-disc pl-5">
          <li><b>組織的</b>：アクセス権限管理、取扱規程整備、ログ監査</li>
          <li><b>人的</b>：関係者への取扱ルール周知・遵守徹底</li>
          <li><b>物理的</b>：端末・媒体の適切な保管、持出制限</li>
          <li><b>技術的</b>：通信の暗号化、パスワード・トークン管理、脆弱性対策、WAF等</li>
          <li><b>委託先管理</b>：機密保持契約、委託先の選定基準・監督</li>
        </ul>
      </Sec>

      <Sec id="crossborder" title="13. 国外移転">
        <p>クラウド事業者等の利用に伴い、日本国外でデータが保管・処理される場合があります。その際は、個人情報保護法その他関連法令に従い、適切な保護措置を講じます。</p>
      </Sec>

      <Sec id="minor" title="14. 未成年の方の個人情報">
        <p>未成年の方の情報は、保護者の同意に基づいて提供されることを前提とし、必要に応じて同意確認手続きを行います（行事参加申込等の実運用に合わせて運用ルールを整備する必要あり）。</p>
      </Sec>

      <Sec id="disclosure" title="15. 開示等の請求（開示・訂正・利用停止・削除）">
        <p>本人（または正当な代理人）は、当会が保有する自己の個人情報について、開示・訂正・追加・削除・利用停止・第三者提供停止等を求めることができます。</p>
        <ul className="mt-2 list-disc pl-5">
          <li>手続方法：お問い合わせ窓口にメールでご連絡ください。本人確認のための情報提示をお願いする場合があります。</li>
          <li>手数料：無料</li>
          <li>法令に基づき、請求の全部または一部に応じられないことがあります。</li>
        </ul>
      </Sec>

      <Sec id="voluntary" title="16. 任意性等">
        <p>メールアドレスは任意項目です。ただし、メールでのQR配布・緊急連絡等の機能は、メールアドレスの登録がない場合に利用できません。必須項目（氏名・所属団・所属地区・RS年齢）が未記入の場合、本サービスの一部機能は提供できません。</p>
      </Sec>

      <Sec id="publish" title="17. 公開・改定">
        <p>本ポリシーは本サービス上（サイトフッター等）で公開し、重要な変更がある場合は当会が適切な方法で告知します。改定後も本サービスの利用を継続した場合、改定内容に同意いただいたものとみなします。</p>
      </Sec>

      <Sec id="contact" title="18. 連絡先（開示等の請求・苦情・相談）">
        <ul className="list-disc pl-5">
          <li>
            お問い合わせ窓口：<a className="text-blue-700 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </li>
          <li>受付時間：平日10:00–18:00（祝日・年末年始を除く）※運用に合わせて変更可</li>
        </ul>
      </Sec>

      <Sec id="appendix" title="付録A：メール配信・QR受付に関する取扱いの明確化">
        <ul className="list-disc pl-5">
          <li><b>メール配信</b>：登録されたメールアドレスは、QRコード表示用URL・行事案内・確認のための連絡に利用します。第三者への販売は行いません。配信停止の希望はいつでも受け付けます。</li>
          <li><b>QR受付</b>：当日受付でQRコードまたは同等のURLを提示いただき、参加者IDと受付時刻を記録します。不正防止のため受付ログを一定期間保持します。</li>
          <li><b>公開範囲</b>：氏名・メールアドレスをWeb上で一般公開することはありません（内部管理目的に限定）。集合写真等を広報に使用する可能性がある場合、別途ご案内・同意取得を行います。</li>
        </ul>
      </Sec>

      {/* JSON-LD（任意）：検索エンジン向けメタデータ */}
      <script
        type="application/ld+json"
        // @ts-ignore - JSON.stringify of structured data
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "プライバシーポリシー",
            description:
              "Aichi Rovers Conference（愛知連盟ローバース会議）のプライバシーポリシー",
            datePublished: EFFECTIVE,
            dateModified: UPDATED,
            publisher: {
              "@type": "Organization",
              name: ORG_NAME,
              email: CONTACT_EMAIL,
            },
            inLanguage: "ja",
            url: "/privacy",
          }),
        }}
      />

      <div className="mt-12">
        <a href="#top" className="text-sm text-slate-600 underline">
          ページ上部へ戻る
        </a>
      </div>
    </main>
  );
}
