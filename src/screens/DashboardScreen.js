import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Animated, Modal, Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';

// ─── Ítem del menú de opciones ─────────────────────────────
const OptionItem = ({ icon, label, description, onPress, color = Colors.accent }) => (
  <TouchableOpacity style={styles.optionItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.optionIcon, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
      <Text style={styles.optionIconText}>{icon}</Text>
    </View>
    <View style={styles.optionText}>
      <Text style={[styles.optionLabel, { color }]}>{label}</Text>
      <Text style={styles.optionDesc}>{description}</Text>
    </View>
    <Text style={[styles.optionArrow, { color }]}>→</Text>
  </TouchableOpacity>
);

const DashboardScreen = ({ navigation }) => {
  const [sheetVisible, setSheetVisible] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const openSheet = () => {
    setSheetVisible(true);
    Animated.spring(sheetAnim, {
      toValue: 1, useNativeDriver: true,
      tension: 65, friction: 11,
    }).start();
  };

  const closeSheet = (callback) => {
    Animated.timing(sheetAnim, {
      toValue: 0, duration: 200, useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
      if (callback) callback();
    });
  };

  const handleOption = (route) => closeSheet(() => navigation.navigate(route));

  const sheetTranslate = sheetAnim.interpolate({
    inputRange: [0, 1], outputRange: [400, 0],
  });
  const backdropOpacity = sheetAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, 1],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>stamping.io</Text>
        </View>
        <View style={{ width: 70 }} />
      </View>

      {/* Cuerpo principal */}
      <View style={styles.body}>
        {/* Icono central decorativo */}
        <View style={styles.centerDecor}>
          <View style={styles.outerRing} />
          <View style={styles.middleRing} />
          <View style={styles.innerCircle}>
            <Text style={styles.centerIcon}>📡</Text>
          </View>
        </View>

        <Text style={styles.bodyTitle}>Panel de control</Text>
        <Text style={styles.bodySubtitle}>
          Usa el botón de opciones para leer un QR o sellar una tarjeta NFC.
        </Text>

        {/* Tarjetas de estado */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📷</Text>
            <Text style={styles.statLabel}>Leer QR</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✍️</Text>
            <Text style={styles.statLabel}>Sellar NFC</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔐</Text>
            <Text style={styles.statLabel}>ECDSA</Text>
          </View>
        </View>
      </View>

      {/* Botón + Opciones — esquina inferior izquierda */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={openSheet}
          activeOpacity={0.85}
          accessibilityLabel="Abrir opciones"
          accessibilityRole="button"
        >
          <Text style={styles.fabIcon}>＋</Text>
          <Text style={styles.fabText}>Opciones</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeSheet()}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet()} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslate }] }]}>
          {/* Handle bar */}
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>Opciones</Text>

          <OptionItem
            icon="📷"
            label="Leer QR"
            description="Escanea un código QR con la cámara"
            color={Colors.accent}
            onPress={() => handleOption('QRScanner')}
          />

          <View style={styles.sheetDivider} />

          <OptionItem
            icon="✍️"
            label="Sellar"
            description="Escribe una URL o texto en una tarjeta NFC"
            color={Colors.success}
            onPress={() => handleOption('NfcWrite')}
          />

          {/* Botón cancelar */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => closeSheet()}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm+4, borderBottomWidth:1, borderBottomColor:Colors.bgBorder },
  backBtn: { paddingVertical:Spacing.xs, paddingHorizontal:Spacing.sm, width:70 },
  backBtnText: { fontSize:FontSize.md, color:Colors.textSecondary, fontWeight:FontWeight.medium },
  headerCenter: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:Spacing.xs },
  headerDot: { width:8, height:8, borderRadius:4, backgroundColor:Colors.accent },
  headerTitle: { fontSize:FontSize.lg, fontWeight:FontWeight.bold, color:Colors.textPrimary },

  // Body
  body: { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:Spacing.xl, gap:Spacing.lg },

  // Decoración central
  centerDecor: { width:200, height:200, alignItems:'center', justifyContent:'center' },
  outerRing: { position:'absolute', width:200, height:200, borderRadius:100, borderWidth:1, borderColor:`rgba(0,229,255,0.08)` },
  middleRing: { position:'absolute', width:150, height:150, borderRadius:75, borderWidth:1, borderColor:`rgba(0,229,255,0.15)` },
  innerCircle: { width:90, height:90, borderRadius:45, backgroundColor:Colors.accentGlow, borderWidth:1.5, borderColor:`rgba(0,229,255,0.3)`, alignItems:'center', justifyContent:'center' },
  centerIcon: { fontSize:36 },

  bodyTitle: { fontSize:FontSize.xxl, fontWeight:FontWeight.bold, color:Colors.textPrimary, textAlign:'center' },
  bodySubtitle: { fontSize:FontSize.md, color:Colors.textSecondary, textAlign:'center', lineHeight:FontSize.md*1.6, maxWidth:280 },

  // Stats
  statsRow: { flexDirection:'row', gap:Spacing.sm, marginTop:Spacing.sm },
  statCard: { flex:1, backgroundColor:Colors.bgCard, borderRadius:Radius.md, padding:Spacing.md, alignItems:'center', gap:Spacing.xs, borderWidth:1, borderColor:Colors.bgBorder },
  statIcon: { fontSize:24 },
  statLabel: { fontSize:FontSize.xs, color:Colors.textSecondary, textAlign:'center', fontWeight:FontWeight.medium },

  // FAB
  fabContainer: { position:'absolute', bottom:Spacing.xl, left:Spacing.xl },
  fab: { flexDirection:'row', alignItems:'center', gap:Spacing.xs, backgroundColor:Colors.accent, borderRadius:Radius.full, paddingVertical:Spacing.sm+2, paddingHorizontal:Spacing.md+4, shadowColor:Colors.accent, shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12, elevation:8 },
  fabIcon: { fontSize:FontSize.lg, color:Colors.bg, fontWeight:FontWeight.black },
  fabText: { fontSize:FontSize.md, fontWeight:FontWeight.bold, color:Colors.bg },

  // Backdrop
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.6)' },

  // Sheet
  sheet: { position:'absolute', bottom:0, left:0, right:0, backgroundColor:Colors.bgCard, borderTopLeftRadius:Radius.xl, borderTopRightRadius:Radius.xl, paddingHorizontal:Spacing.lg, paddingBottom:Spacing.xxl, paddingTop:Spacing.md, borderTopWidth:1, borderColor:Colors.bgBorder },
  sheetHandle: { width:40, height:4, borderRadius:2, backgroundColor:Colors.bgBorder, alignSelf:'center', marginBottom:Spacing.md },
  sheetTitle: { fontSize:FontSize.lg, fontWeight:FontWeight.bold, color:Colors.textPrimary, marginBottom:Spacing.md },
  sheetDivider: { height:1, backgroundColor:Colors.bgBorder, marginVertical:Spacing.xs },

  // Option items
  optionItem: { flexDirection:'row', alignItems:'center', paddingVertical:Spacing.md, gap:Spacing.md },
  optionIcon: { width:48, height:48, borderRadius:Radius.md, borderWidth:1, alignItems:'center', justifyContent:'center' },
  optionIconText: { fontSize:22 },
  optionText: { flex:1 },
  optionLabel: { fontSize:FontSize.md, fontWeight:FontWeight.semibold },
  optionDesc: { fontSize:FontSize.sm, color:Colors.textSecondary, marginTop:2 },
  optionArrow: { fontSize:FontSize.lg, fontWeight:FontWeight.bold },

  // Cancel
  cancelBtn: { marginTop:Spacing.md, paddingVertical:Spacing.md, alignItems:'center', backgroundColor:Colors.bgSurface, borderRadius:Radius.md, borderWidth:1, borderColor:Colors.bgBorder },
  cancelBtnText: { fontSize:FontSize.md, color:Colors.textSecondary, fontWeight:FontWeight.medium },
});

export default DashboardScreen;