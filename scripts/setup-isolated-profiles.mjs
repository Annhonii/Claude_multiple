import fs from 'node:fs';
import path from 'node:path';
const root='android/app/src/main';
const pkgDir=path.join(root,'java/com/annhonii/claudemultiple');
fs.mkdirSync(pkgDir,{recursive:true});
fs.writeFileSync(path.join(pkgDir,'IsolatedProfilesPlugin.java'), `package com.annhonii.claudemultiple;
import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name="IsolatedProfiles")
public class IsolatedProfilesPlugin extends Plugin {
 @PluginMethod public void openProfile(PluginCall call) {
  int slot=call.getInt("slot",0); String name=call.getString("name","Claude"); Class<?> target;
  switch(slot) {
   case 1: target=ClaudeProfile1Activity.class; break;
   case 2: target=ClaudeProfile2Activity.class; break;
   case 3: target=ClaudeProfile3Activity.class; break;
   case 4: target=ClaudeProfile4Activity.class; break;
   case 5: target=ClaudeProfile5Activity.class; break;
   default: call.reject("Profile slot must be between 1 and 5"); return;
  }
  Intent intent=new Intent(getContext(),target); intent.putExtra("profile_name",name);
  getActivity().startActivity(intent); call.resolve();
 }
}
`);
fs.writeFileSync(path.join(pkgDir,'IsolatedProfileActivity.java'), `package com.annhonii.claudemultiple;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.IOException;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public abstract class IsolatedProfileActivity extends Activity {
 private static final int FILE_REQUEST=7812;
 private ValueCallback<Uri[]> fileCallback;
 private WebView webView;
 protected abstract int profileSlot();

 @Override protected void onCreate(Bundle state) {
  if(android.os.Build.VERSION.SDK_INT>=28) WebView.setDataDirectorySuffix("claude_profile_"+profileSlot());
  super.onCreate(state);
  String profileName=getIntent().getStringExtra("profile_name");
  if(profileName==null||profileName.trim().isEmpty()) profileName="Claude";
  LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(0xFFF7F6F2);
  LinearLayout bar=new LinearLayout(this); bar.setGravity(android.view.Gravity.CENTER_VERTICAL); bar.setPadding(12,4,12,4);
  Button back=new Button(this); back.setText("‹"); back.setOnClickListener(v->{if(webView.canGoBack())webView.goBack();else finish();});
  TextView title=new TextView(this); title.setText(profileName); title.setTextColor(0xFF222222); title.setTextSize(17); title.setPadding(10,0,0,0);
  bar.addView(back); bar.addView(title,new LinearLayout.LayoutParams(0,ViewGroup.LayoutParams.WRAP_CONTENT,1)); root.addView(bar);
  webView=new WebView(this); webView.getSettings().setJavaScriptEnabled(true); webView.getSettings().setDomStorageEnabled(true);
  webView.getSettings().setDatabaseEnabled(true); webView.getSettings().setAllowFileAccess(true);
  CookieManager cookies=CookieManager.getInstance(); cookies.setAcceptCookie(true); cookies.setAcceptThirdPartyCookies(webView,true);
  webView.addJavascriptInterface(new Object(){
   @JavascriptInterface public void saveBlob(String base64,String fileName,String mimeType){
    runOnUiThread(()->{
     String safeName=(fileName==null||fileName.trim().isEmpty()?"claude-download":fileName).replaceAll("[\\\\/:*?\\\"<>|]","_");
     if(!safeName.toLowerCase().endsWith(".zip") && mimeType!=null && mimeType.toLowerCase().contains("zip")) safeName += ".zip";
     try{
      byte[] bytes=Base64.decode(base64,Base64.DEFAULT); Uri saved;
      if(Build.VERSION.SDK_INT>=29){
       ContentValues values=new ContentValues(); values.put(MediaStore.Downloads.DISPLAY_NAME,safeName);
       values.put(MediaStore.Downloads.MIME_TYPE,mimeType==null?"application/octet-stream":mimeType);
       values.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS);
       values.put(MediaStore.Downloads.IS_PENDING,1);
       saved=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
       if(saved==null) throw new IOException("Could not create Downloads file");
       try(OutputStream out=getContentResolver().openOutputStream(saved)){if(out==null)throw new IOException("Could not open Downloads file");out.write(bytes);}
       ContentValues done=new ContentValues();done.put(MediaStore.Downloads.IS_PENDING,0);getContentResolver().update(saved,done,null,null);
      }else{
       File dir=Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);if(!dir.exists())dir.mkdirs();
       File file=new File(dir,safeName);try(FileOutputStream out=new FileOutputStream(file)){out.write(bytes);} saved=Uri.fromFile(file);
      }
      Toast.makeText(IsolatedProfileActivity.this,"Downloaded: "+safeName,Toast.LENGTH_LONG).show();
     }catch(Exception ex){Toast.makeText(IsolatedProfileActivity.this,"Download failed: "+ex.getMessage(),Toast.LENGTH_LONG).show();}
    });
   }
  },"AndroidDownloadBridge");
  webView.setWebViewClient(new WebViewClient(){
   @Override public void onPageFinished(WebView view,String url){
    super.onPageFinished(view,url);
    String patch="(function(){if(window.__claudeBlobDownloadPatch)return;window.__claudeBlobDownloadPatch=true;document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[download]'):null;if(!a)return;var u=a.href||'';if(u.indexOf('blob:')!==0&&u.indexOf('data:')!==0)return;e.preventDefault();e.stopPropagation();fetch(u).then(function(r){return r.blob()}).then(function(b){var fr=new FileReader();fr.onload=function(){var d=String(fr.result).split(',')[1]||'';window.AndroidDownloadBridge.saveBlob(d,a.download||'claude-download',b.type||'application/octet-stream')};fr.readAsDataURL(b)}).catch(function(err){console.error('Blob download failed',err);alert('Could not prepare this download. Please retry.')} )},true)})();";
    view.evaluateJavascript(patch,null);
   }
  });
  webView.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
    if(fileCallback!=null)fileCallback.onReceiveValue(null); fileCallback=callback;
    try{startActivityForResult(params.createIntent(),FILE_REQUEST);return true;}
    catch(ActivityNotFoundException e){fileCallback=null;return false;}
   }
  });
  webView.setDownloadListener((url,userAgent,disposition,mimeType,size)->{
   try{
    Uri downloadUri=Uri.parse(url);
    if(!"http".equalsIgnoreCase(downloadUri.getScheme())&&!"https".equalsIgnoreCase(downloadUri.getScheme())){Toast.makeText(this,"Unsupported download link: "+downloadUri.getScheme(),Toast.LENGTH_LONG).show();return;}
    DownloadManager.Request req=new DownloadManager.Request(downloadUri); req.setMimeType(mimeType);
    String cookie=CookieManager.getInstance().getCookie(url); if(cookie!=null)req.addRequestHeader("Cookie",cookie);
    if(userAgent!=null)req.addRequestHeader("User-Agent",userAgent);
    req.addRequestHeader("Referer","https://claude.ai/");
    req.setAllowedOverMetered(true); req.setAllowedOverRoaming(true);
    req.setTitle(android.webkit.URLUtil.guessFileName(url,disposition,mimeType));
    req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
    req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,android.webkit.URLUtil.guessFileName(url,disposition,mimeType));
    ((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(req);
   }catch(Exception e){android.util.Log.e("ClaudeDownload","Could not start download",e);Toast.makeText(this,"Download failed: "+e.getMessage(),Toast.LENGTH_LONG).show();}
  });
  root.addView(webView,new LinearLayout.LayoutParams(-1,0,1)); setContentView(root); webView.loadUrl("https://claude.ai/new");
 }
 @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
  super.onActivityResult(requestCode,resultCode,data);
  if(requestCode==FILE_REQUEST&&fileCallback!=null){fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode,data));fileCallback=null;}
 }
 @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(fileCallback!=null)fileCallback.onReceiveValue(null);if(webView!=null){webView.destroy();webView=null;}super.onDestroy();}
}
`);
for(let n=1;n<=5;n++) fs.writeFileSync(path.join(pkgDir,'ClaudeProfile'+n+'Activity.java'),'package com.annhonii.claudemultiple;\npublic final class ClaudeProfile'+n+'Activity extends IsolatedProfileActivity { @Override protected int profileSlot(){return '+n+';} }\n');
const manifestPath=path.join(root,'AndroidManifest.xml'); let manifest=fs.readFileSync(manifestPath,'utf8');
if(!manifest.includes('ClaudeProfile1Activity')){
 let entries=''; for(let n=1;n<=5;n++) entries+='    <activity android:name=".ClaudeProfile'+n+'Activity" android:exported="false" android:process=":claude_profile_'+n+'" android:theme="@style/AppTheme.NoActionBar" />\n';
 manifest=manifest.replace('</application>',entries+'</application>'); fs.writeFileSync(manifestPath,manifest);
}
function findMainActivity(dir) {
 if(!fs.existsSync(dir)) return null;
 for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
  const full=path.join(dir,entry.name);
  if(entry.isDirectory()) { const found=findMainActivity(full); if(found) return found; }
  else if(entry.name==='MainActivity.kt'||entry.name==='MainActivity.java') return full;
 }
 return null;
}
const mainPath=findMainActivity(path.join(root,'java')) || findMainActivity(path.join(root,'kotlin'));
if(!mainPath) throw new Error('Generated MainActivity source was not found under android/app/src/main');
if(mainPath.endsWith('.kt')) {
 const main='package com.annhonii.claudemultiple\n\nimport android.os.Bundle\nimport com.getcapacitor.BridgeActivity\n\nclass MainActivity : BridgeActivity() {\n override fun onCreate(savedInstanceState: Bundle?) {\n  registerPlugin(IsolatedProfilesPlugin::class.java)\n  super.onCreate(savedInstanceState)\n }\n}\n';
 fs.writeFileSync(mainPath,main);
} else {
 let main=fs.readFileSync(mainPath,'utf8');
 if(!main.includes('IsolatedProfilesPlugin')) {
  main=main.replace(/public class MainActivity extends BridgeActivity\s*\{/, 'public class MainActivity extends BridgeActivity {\n @Override protected void onCreate(Bundle savedInstanceState) { registerPlugin(IsolatedProfilesPlugin.class); super.onCreate(savedInstanceState); }');
  if(!main.includes('registerPlugin(IsolatedProfilesPlugin.class)')) {
   main='package com.annhonii.claudemultiple;\n\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n @Override protected void onCreate(Bundle savedInstanceState) { registerPlugin(IsolatedProfilesPlugin.class); super.onCreate(savedInstanceState); }\n}\n';
  } else if(!main.includes('import android.os.Bundle;')) {
   main=main.replace(/package [^;]+;\s*/, match=>match+'\nimport android.os.Bundle;\n');
  }
  fs.writeFileSync(mainPath,main);
 }
}
console.log('Configured five isolated native WebView profiles.');
